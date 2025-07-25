import os
import json
import shutil
import re
from datetime import datetime

def get_flood_folders():
    """获取flood_tiles文件夹中的所有文件夹名"""
    flood_tiles_dir = 'data/flood_tiles'
    folders = []
    
    for item in os.listdir(flood_tiles_dir):
        if os.path.isdir(os.path.join(flood_tiles_dir, item)) and item.startswith('waterdepth_'):
            folders.append(item)
    
    # 按时间戳排序
    folders.sort()
    return folders

def get_infrastructure_files():
    """获取time_series_infrastructure文件夹中的所有JSON文件名"""
    infra_dir = 'data/time_series_infrastructure'
    files = []
    
    if not os.path.exists(infra_dir):
        os.makedirs(infra_dir)
        return files
    
    for item in os.listdir(infra_dir):
        if item.endswith('.json') and item.startswith('infrastructure_'):
            files.append(item)
    
    # 按时间戳排序
    files.sort()
    return files

def extract_date_from_folder(folder_name):
    """从文件夹名称中提取日期和时间"""
    match = re.match(r'waterdepth_(\d{8})_(\d{6})', folder_name)
    if match:
        date_str, time_str = match.groups()
        return f"{date_str}_{time_str}"
    return None

def extract_date_from_file(file_name):
    """从文件名中提取日期和时间"""
    match = re.match(r'infrastructure_(\d{8})_(\d{6})\.json', file_name)
    if match:
        date_str, time_str = match.groups()
        return f"{date_str}_{time_str}"
    return None

def load_base_infrastructure_data():
    """加载基础基础设施数据"""
    try:
        with open('data/hierarchical_infrastructure.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading base infrastructure data: {e}")
        return None

def load_existing_infrastructure_data(file_path):
    """加载现有的基础设施数据"""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading existing infrastructure data: {e}")
        return None

def save_infrastructure_data(data, file_path):
    """保存基础设施数据到文件"""
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Saved infrastructure data to {file_path}")
        return True
    except Exception as e:
        print(f"Error saving infrastructure data: {e}")
        return False

def sync_infrastructure_data():
    """同步基础设施数据与洪水瓦片数据"""
    flood_folders = get_flood_folders()
    infra_files = get_infrastructure_files()
    
    # 提取日期和时间
    flood_dates = {extract_date_from_folder(folder): folder for folder in flood_folders}
    infra_dates = {extract_date_from_file(file): file for file in infra_files}
    
    # 加载基础数据
    base_data = load_base_infrastructure_data()
    if not base_data:
        print("Failed to load base infrastructure data. Exiting.")
        return
    
    # 创建备份目录
    backup_dir = 'data/time_series_infrastructure_backup'
    if os.path.exists(backup_dir):
        shutil.rmtree(backup_dir)
    os.makedirs(backup_dir)
    
    # 备份现有文件
    for file in infra_files:
        src = os.path.join('data/time_series_infrastructure', file)
        dst = os.path.join(backup_dir, file)
        shutil.copy2(src, dst)
    print(f"Backed up {len(infra_files)} existing infrastructure files to {backup_dir}")
    
    # 清空目标目录
    for file in infra_files:
        os.remove(os.path.join('data/time_series_infrastructure', file))
    
    # 为每个洪水文件夹创建对应的基础设施数据
    print(f"Creating infrastructure data for {len(flood_folders)} flood folders...")
    
    # 如果有现有数据，加载第一个作为模板
    template_data = None
    if infra_files:
        template_path = os.path.join(backup_dir, infra_files[0])
        template_data = load_existing_infrastructure_data(template_path)
    
    for date_str, folder in flood_dates.items():
        output_file = f"infrastructure_{date_str}.json"
        output_path = os.path.join('data/time_series_infrastructure', output_file)
        
        # 如果有对应的备份文件，使用它
        backup_file = infra_dates.get(date_str)
        if backup_file:
            backup_path = os.path.join(backup_dir, backup_file)
            data = load_existing_infrastructure_data(backup_path)
            if data:
                save_infrastructure_data(data, output_path)
                continue
        
        # 否则，使用模板数据或基础数据
        if template_data:
            save_infrastructure_data(template_data, output_path)
        else:
            save_infrastructure_data(base_data, output_path)
    
    print("Synchronization completed.")

if __name__ == "__main__":
    sync_infrastructure_data() 