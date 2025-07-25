import os
import json
import re
import random
from datetime import datetime, timedelta

# 定义河流区域的坐标范围
RIVER_AREA = {
    'min_lon': 147.35, 
    'max_lon': 147.42, 
    'min_lat': -35.15, 
    'max_lat': -35.08
}

def is_in_river_area(coordinates):
    """检查坐标是否在河流区域内"""
    lon, lat = coordinates
    return (RIVER_AREA['min_lon'] <= lon <= RIVER_AREA['max_lon'] and 
            RIVER_AREA['min_lat'] <= lat <= RIVER_AREA['max_lat'])

def extract_date_from_folder(folder_name):
    """从文件夹名称中提取日期和时间"""
    match = re.match(r'waterdepth_(\d{8})_(\d{6})', folder_name)
    if match:
        date_str, time_str = match.groups()
        return datetime.strptime(f"{date_str}_{time_str}", "%Y%m%d_%H%M%S")
    return None

def get_flood_folders():
    """获取flood_tiles文件夹中的所有文件夹名并按时间排序"""
    flood_tiles_dir = 'data/flood_tiles'
    folders = []
    
    for item in os.listdir(flood_tiles_dir):
        if os.path.isdir(os.path.join(flood_tiles_dir, item)) and item.startswith('waterdepth_'):
            folders.append(item)
    
    # 按时间戳排序
    folders.sort(key=extract_date_from_folder)
    return folders

def calculate_flood_severity(folder_name, all_folders):
    """根据文件夹名称计算洪水严重程度"""
    date = extract_date_from_folder(folder_name)
    if not date:
        return 0.0
    
    # 获取所有日期
    all_dates = [extract_date_from_folder(f) for f in all_folders]
    all_dates = [d for d in all_dates if d]
    
    # 计算洪水周期
    min_date = min(all_dates)
    max_date = max(all_dates)
    total_days = (max_date - min_date).total_seconds() / (24 * 3600)
    
    if total_days == 0:
        return 0.5
    
    # 计算当前日期在周期中的位置
    days_from_start = (date - min_date).total_seconds() / (24 * 3600)
    
    # 创建一个简单的洪水模型，洪水在中间最严重
    # 使用正弦曲线模拟洪水上升和下降
    phase = days_from_start / total_days
    severity = 0.0
    
    if phase < 0.5:
        # 上升阶段
        severity = phase * 2.0
    else:
        # 下降阶段
        severity = (1.0 - phase) * 2.0
    
    # 添加一些随机波动
    severity = min(1.0, max(0.0, severity + random.uniform(-0.1, 0.1)))
    
    return severity

def load_infrastructure_data(file_path):
    """加载基础设施数据"""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading infrastructure data from {file_path}: {e}")
        return None

def save_infrastructure_data(data, file_path):
    """保存基础设施数据"""
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving infrastructure data to {file_path}: {e}")
        return False

def identify_riverside_infrastructure(data):
    """识别河边的基础设施"""
    riverside_infrastructure = {
        'power_plants': [],
        'substations': [],
        'transformers': [],
        'towers': [],
        'cables': []
    }
    
    # 检查发电厂
    for plant in data['infrastructure_hierarchy']['level_1_power_plants']:
        if is_in_river_area(plant['coordinates']):
            riverside_infrastructure['power_plants'].append(plant['id'])
    
    # 检查变电站
    for substation in data['infrastructure_hierarchy']['level_2_substations']:
        if is_in_river_area(substation['coordinates']):
            riverside_infrastructure['substations'].append(substation['id'])
    
    # 检查变压器
    for transformer in data['infrastructure_hierarchy']['level_3_transformers']:
        if is_in_river_area(transformer['coordinates']):
            riverside_infrastructure['transformers'].append(transformer['id'])
    
    # 检查通信塔
    for tower in data['infrastructure_hierarchy']['level_4_communication_towers']:
        if is_in_river_area(tower['coordinates']):
            riverside_infrastructure['towers'].append(tower['id'])
    
    # 检查电缆
    for cable in data['hierarchical_power_cables']['features']:
        for coord in cable['geometry']['coordinates']:
            if is_in_river_area(coord):
                riverside_infrastructure['cables'].append(cable['properties']['cable_id'])
                break
    
    return riverside_infrastructure

def update_infrastructure_status(data, riverside_infrastructure, flood_severity):
    """更新基础设施状态"""
    # 状态转换概率
    warning_probability = min(0.1 + flood_severity * 0.4, 0.9)
    down_probability = min(0.05 + flood_severity * 0.3, 0.7)
    
    # 影响传播因子
    propagation_factor = 0.7
    
    # 跟踪状态变化
    status_changes = {}
    
    # 更新发电厂状态
    for plant in data['infrastructure_hierarchy']['level_1_power_plants']:
        if plant['id'] in riverside_infrastructure['power_plants']:
            update_status(plant, warning_probability, down_probability, status_changes)
    
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
            update_status(substation, warning_probability * prob_modifier, down_probability * prob_modifier, status_changes)
    
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
            update_status(transformer, warning_probability * prob_modifier, down_probability * prob_modifier, status_changes)
    
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
            # 通信塔可能没有status字段，添加一个
            tower['status'] = tower.get('status', 'operational')
            update_status(tower, warning_probability * prob_modifier, down_probability * prob_modifier, status_changes)
    
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
            update_cable_status(cable, warning_probability * prob_modifier, down_probability * prob_modifier, status_changes)
    
    return data

def update_status(item, warning_prob, down_prob, status_changes):
    """更新单个基础设施的状态"""
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
            # 有小概率恢复
            if random.random() < 0.1:
                new_status = 'operational'
    else:  # 'down'
        # 故障状态通常保持故障，但有小概率恢复
        new_status = 'down'
        if random.random() < 0.05:
            new_status = 'warning'
    
    item['status'] = new_status
    status_changes[item_id] = new_status

def update_cable_status(cable, warning_prob, down_prob, status_changes):
    """更新电缆状态"""
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
            if random.random() < 0.1:
                new_status = 'operational'
    else:  # 'down'
        new_status = 'down'
        if random.random() < 0.05:
            new_status = 'warning'
    
    cable['properties']['status'] = new_status
    status_changes[cable_id] = new_status

def generate_infrastructure_states():
    """根据洪水数据生成基础设施状态"""
    # 获取洪水文件夹
    flood_folders = get_flood_folders()
    if not flood_folders:
        print("No flood folders found.")
        return
    
    # 加载基础数据
    base_data = load_infrastructure_data('data/hierarchical_infrastructure.json')
    if not base_data:
        print("Failed to load base infrastructure data.")
        return
    
    # 识别河边基础设施
    riverside_infrastructure = identify_riverside_infrastructure(base_data)
    print("Riverside infrastructure identified:")
    for category, items in riverside_infrastructure.items():
        print(f"  {category}: {len(items)} items")
    
    # 为每个洪水文件夹生成对应的基础设施状态
    for folder in flood_folders:
        # 计算洪水严重程度
        flood_severity = calculate_flood_severity(folder, flood_folders)
        
        # 提取时间戳
        date = extract_date_from_folder(folder)
        if not date:
            continue
        
        time_str = date.strftime("%Y%m%d_%H%M%S")
        output_file = f"infrastructure_{time_str}.json"
        output_path = os.path.join('data/time_series_infrastructure', output_file)
        
        # 复制基础数据并更新状态
        data = json.loads(json.dumps(base_data))  # 深拷贝
        updated_data = update_infrastructure_status(data, riverside_infrastructure, flood_severity)
        
        # 保存更新后的数据
        if save_infrastructure_data(updated_data, output_path):
            print(f"Generated infrastructure data for {folder} (severity: {flood_severity:.2f})")
        else:
            print(f"Failed to save infrastructure data for {folder}")
    
    print("Infrastructure state generation completed.")

if __name__ == "__main__":
    # 设置随机种子以确保结果可重现
    random.seed(42)
    generate_infrastructure_states() 