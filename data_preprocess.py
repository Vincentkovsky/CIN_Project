import json
import os
import copy
import math
import random
from datetime import datetime, timedelta

# 读取原始基础设施数据
def load_infrastructure_data():
    with open('data/hierarchical_infrastructure.json', 'r') as f:
        return json.load(f)

# 确定哪些基础设施靠近河道（模拟）
def identify_riverside_infrastructure(data):
    # 这里我们假设一个简单的区域作为"河道区域"
    # 实际应用中，这可能需要更复杂的地理信息处理
    river_area = {
        'min_lon': 147.35, 
        'max_lon': 147.42, 
        'min_lat': -35.15, 
        'max_lat': -35.08
    }
    
    riverside_infrastructure = {
        'power_plants': [],
        'substations': [],
        'transformers': [],
        'towers': [],
        'cables': []
    }
    
    # 检查发电厂
    for plant in data['infrastructure_hierarchy']['level_1_power_plants']:
        lon, lat = plant['coordinates']
        if (river_area['min_lon'] <= lon <= river_area['max_lon'] and 
            river_area['min_lat'] <= lat <= river_area['max_lat']):
            riverside_infrastructure['power_plants'].append(plant['id'])
    
    # 检查变电站
    for substation in data['infrastructure_hierarchy']['level_2_substations']:
        lon, lat = substation['coordinates']
        if (river_area['min_lon'] <= lon <= river_area['max_lon'] and 
            river_area['min_lat'] <= lat <= river_area['max_lat']):
            riverside_infrastructure['substations'].append(substation['id'])
    
    # 检查变压器
    for transformer in data['infrastructure_hierarchy']['level_3_transformers']:
        lon, lat = transformer['coordinates']
        if (river_area['min_lon'] <= lon <= river_area['max_lon'] and 
            river_area['min_lat'] <= lat <= river_area['max_lat']):
            riverside_infrastructure['transformers'].append(transformer['id'])
    
    # 检查通信塔
    for tower in data['infrastructure_hierarchy']['level_4_communication_towers']:
        lon, lat = tower['coordinates']
        if (river_area['min_lon'] <= lon <= river_area['max_lon'] and 
            river_area['min_lat'] <= lat <= river_area['max_lat']):
            riverside_infrastructure['towers'].append(tower['id'])
    
    # 检查电缆
    for cable in data['hierarchical_power_cables']['features']:
        coords = cable['geometry']['coordinates']
        for lon, lat in coords:
            if (river_area['min_lon'] <= lon <= river_area['max_lon'] and 
                river_area['min_lat'] <= lat <= river_area['max_lat']):
                riverside_infrastructure['cables'].append(cable['properties']['cable_id'])
                break
    
    return riverside_infrastructure

# 生成时序数据
def generate_time_series_data(data, riverside_infrastructure):
    # 创建输出目录
    output_dir = 'data/time_series_infrastructure'
    os.makedirs(output_dir, exist_ok=True)
    
    # 设置起始时间
    start_time = datetime(2022, 10, 8, 0, 0, 0)  # 与洪水数据相匹配
    
    # 生成48个时间点（每半小时一个）
    for i in range(48):
        current_time = start_time + timedelta(minutes=30 * i)
        time_str = current_time.strftime('%Y%m%d_%H%M%S')
        
        # 复制原始数据
        time_data = copy.deepcopy(data)
        
        # 计算洪水严重程度（简单模拟，随时间增加而增加，然后在中间开始下降）
        flood_severity = min(i / 24.0, (48 - i) / 24.0) * 2.0  # 0到2之间的值
        
        # 更新河边基础设施状态
        update_infrastructure_status(time_data, riverside_infrastructure, flood_severity, i)
    
        # 保存时间点数据
        output_file = os.path.join(output_dir, f'infrastructure_{time_str}.json')
        with open(output_file, 'w') as f:
            json.dump(time_data, f, indent=2)
        
        print(f"Generated data for time point: {time_str}")

# 更新基础设施状态
def update_infrastructure_status(data, riverside_infrastructure, flood_severity, time_index):
    # 状态转换概率
    # 随着洪水严重程度增加，状态恶化的概率增加
    warning_probability = min(0.1 + flood_severity * 0.2, 0.8)
    down_probability = min(0.05 + flood_severity * 0.15, 0.6)
    
    # 影响传播
    # 如果上游设备出现问题，下游设备也更容易出现问题
    propagation_factor = 0.7
    
    # 跟踪已更改的状态
    status_changes = {}
    
    # 更新发电厂状态
    for plant in data['infrastructure_hierarchy']['level_1_power_plants']:
        if plant['id'] in riverside_infrastructure['power_plants']:
            update_status(plant, warning_probability, down_probability, time_index, status_changes)
    
    # 更新变电站状态
    for substation in data['infrastructure_hierarchy']['level_2_substations']:
        # 检查上游连接
        connected_to_affected = False
        if 'receives_from' in substation:
            for upstream_id in substation['receives_from']:
                if upstream_id in status_changes and status_changes[upstream_id] != 'operational':
                    connected_to_affected = True
                    break
        
        prob_modifier = propagation_factor if connected_to_affected else 1.0
        
        if substation['id'] in riverside_infrastructure['substations'] or connected_to_affected:
            update_status(substation, warning_probability * prob_modifier, down_probability * prob_modifier, time_index, status_changes)
    
    # 更新变压器状态
    for transformer in data['infrastructure_hierarchy']['level_3_transformers']:
        # 检查上游连接
        connected_to_affected = False
        if 'receives_from' in transformer:
            for upstream_id in transformer['receives_from']:
                if upstream_id in status_changes and status_changes[upstream_id] != 'operational':
                    connected_to_affected = True
                    break
        
        prob_modifier = propagation_factor if connected_to_affected else 1.0
        
        if transformer['id'] in riverside_infrastructure['transformers'] or connected_to_affected:
            update_status(transformer, warning_probability * prob_modifier, down_probability * prob_modifier, time_index, status_changes)
    
    # 更新通信塔状态
    for tower in data['infrastructure_hierarchy']['level_4_communication_towers']:
        # 检查上游连接
        connected_to_affected = False
        if 'receives_from' in tower:
            for upstream_id in tower['receives_from']:
                if upstream_id in status_changes and status_changes[upstream_id] != 'operational':
                    connected_to_affected = True
                    break
        
        prob_modifier = propagation_factor if connected_to_affected else 1.0
        
        if tower['id'] in riverside_infrastructure['towers'] or connected_to_affected:
            # 通信塔没有status字段，我们添加一个
            tower['status'] = tower.get('status', 'operational')
            update_status(tower, warning_probability * prob_modifier, down_probability * prob_modifier, time_index, status_changes)
    
    # 更新电缆状态
    for cable in data['hierarchical_power_cables']['features']:
        cable_id = cable['properties']['cable_id']
        
        # 检查连接的设备
        from_id = cable['properties']['from']
        to_id = cable['properties']['to']
        connected_to_affected = (from_id in status_changes and status_changes[from_id] != 'operational') or \
                               (to_id in status_changes and status_changes[to_id] != 'operational')
        
        prob_modifier = propagation_factor if connected_to_affected else 1.0
        
        if cable_id in riverside_infrastructure['cables'] or connected_to_affected:
            update_cable_status(cable, warning_probability * prob_modifier, down_probability * prob_modifier, time_index, status_changes)
    
# 更新单个基础设施的状态
def update_status(item, warning_prob, down_prob, time_index, status_changes):
    current_status = item['status']
    item_id = item['id']
    
    # 状态转换逻辑
    if current_status == 'operational':
        # 正常状态可能变为警告或故障
        if random.random() < down_prob:
            new_status = 'down'
        elif random.random() < warning_prob:
            new_status = 'warning'
        else:
            new_status = 'operational'
    elif current_status == 'warning':
        # 警告状态可能变为故障或保持警告
        if random.random() < down_prob * 1.5:  # 警告状态更容易变为故障
            new_status = 'down'
        else:
            new_status = 'warning'
            # 随着时间推移，如果洪水减退，有可能恢复
            if time_index > 30 and random.random() < 0.3:
                new_status = 'operational'
    else:  # 'down'
        # 故障状态通常保持故障，但随着时间推移可能恢复
        new_status = 'down'
        if time_index > 36 and random.random() < 0.2:
            new_status = 'warning'
    
    item['status'] = new_status
    status_changes[item_id] = new_status

# 更新电缆状态
def update_cable_status(cable, warning_prob, down_prob, time_index, status_changes):
    current_status = cable['properties']['status']
    cable_id = cable['properties']['cable_id']
    
    # 状态转换逻辑，与update_status类似
    if current_status == 'operational':
        if random.random() < down_prob:
            new_status = 'down'
        elif random.random() < warning_prob:
            new_status = 'warning'
        else:
            new_status = 'operational'
    elif current_status == 'warning':
        if random.random() < down_prob * 1.5:
            new_status = 'down'
        else:
            new_status = 'warning'
            if time_index > 30 and random.random() < 0.3:
                new_status = 'operational'
    else:  # 'down'
        new_status = 'down'
        if time_index > 36 and random.random() < 0.2:
            new_status = 'warning'
    
    cable['properties']['status'] = new_status
    status_changes[cable_id] = new_status

if __name__ == "__main__":
    # 加载原始数据
    data = load_infrastructure_data()
    
    # 识别河边基础设施
    riverside_infrastructure = identify_riverside_infrastructure(data)
    print("Riverside infrastructure identified:")
    for category, items in riverside_infrastructure.items():
        print(f"  {category}: {len(items)} items")
    
    # 生成时序数据
    generate_time_series_data(data, riverside_infrastructure)
    
    print("Time series data generation completed.")

