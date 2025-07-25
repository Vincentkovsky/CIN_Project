import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Map as MapGL, NavigationControl, useControl } from 'react-map-gl';
import { PolygonLayer, GeoJsonLayer, ColumnLayer, BitmapLayer, PathLayer, ScatterplotLayer, IconLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { SimpleMeshLayer, ScenegraphLayer } from '@deck.gl/mesh-layers';
import { MapboxOverlay as DeckOverlay } from '@deck.gl/mapbox';
import { OBJLoader } from '@loaders.gl/obj';
import { GLTFLoader } from '@loaders.gl/gltf';
import {registerLoaders} from '@loaders.gl/core';
import 'mapbox-gl/dist/mapbox-gl.css';

//MUI Components
import PowerResilienceCard from './components/PowerResilienceControl';
import FloodTimelineControl from './components/FloodTimelineControl';

registerLoaders([OBJLoader, GLTFLoader]);

// source: Natural Earth http://www.naturalearthdata.com/ via geojson.xyz
const PREC = 'data/precipitation.json';
const HIERARCHICAL_INFRASTRUCTURE = 'data/hierarchical_infrastructure.json';
const TIME_SERIES_INFRASTRUCTURE_BASE = 'data/time_series_infrastructure/infrastructure_';
const FLOOD_TILES_BASE = 'data/flood_tiles';

// Model paths
const POWER_PLANT_MODEL = 'data/models/power_plant.glb';
const SUBSTATION_MODEL = 'data/models/substation.glb';
const TRANSFORMER_MODEL = 'data/models/transformer.glb';
const TOWER_MODEL = 'data/models/tower.glb';  // 更新为.glb文件

// 状态颜色映射函数
const getStatusColor = (status) => {
  switch(status) {
    case 'down':
      return [255, 0, 0]; // 红色
    case 'warning':
    case 'high_load':
      return [255, 255, 0]; // 黄色
    case 'operational':
    case 'normal':
    default:
      return [0, 255, 0]; // 绿色
  }
};

// 电缆状态颜色映射函数
const getStatusColorString = (status) => {
  switch(status) {
    case 'down':
      return 'rgb(255, 0, 0)'; // 红色
    case 'warning':
    case 'high_load':
      return 'rgb(255, 255, 0)'; // 黄色
    case 'operational':
    case 'normal':
    default:
      return 'rgb(0, 255, 0)'; // 绿色
  }
};

// 从环境变量中读取Mapbox token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 
  'pk.eyJ1IjoiamFsZW5rYW5nIiwiYSI6ImNseWNxY2ttcTFxaHIycm9sMDRteDFrbDAifQ.vqfdfdxjCOE9vZgxxGORnw'; // 回退值

const INITIAL_VIEW_STATE = {
  latitude: -35.1276,
  longitude: 147.3521,
  zoom: 13,
  bearing: 0,
  pitch: 45
};

const MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';

function DeckGLOverlay(props) {
  const overlay = useControl(() => new DeckOverlay({
    ...props,
    getTooltip: props.getTooltip, // 传递 getTooltip 属性
  }));
  overlay.setProps(props);
  return null;
}

function Root() {
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(INITIAL_VIEW_STATE.zoom);
  const [currentTimestep, setCurrentTimestep] = useState(null);
  const [precipitationData, setPrecipitationData] = useState(null);
  const [infrastructureData, setInfrastructureData] = useState(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [powerParticles, setPowerParticles] = useState([]);
  const [floodTimestamps, setFloodTimestamps] = useState([]);
  const [layerVisibility, setLayerVisibility] = useState({
    prec: false,
    rfcst: false,
    tower: false,
    flood: true,
    power: true,
    infrastructure: true
  });

  // 加载洪水瓦片文件夹列表
  useEffect(() => {
    const loadFloodTimestamps = async () => {
      try {
        // 使用fetch API获取文件夹列表
        const response = await fetch('/api/list-flood-folders');
        
        if (!response.ok) {
          console.warn('Failed to load flood folders list, using hardcoded fallback');
          // 使用硬编码的回退值
          setFloodTimestamps([{
            time: 'waterdepth_20221024_000000',
            display: '2022-10-24 00:00'
          }]);
          return;
        }
        
        const folders = await response.json();
        
        // 处理文件夹名称，提取时间戳信息
        const timesteps = folders.map(folder => {
          // 假设文件夹名格式为 waterdepth_YYYYMMDD_HHMMSS
          const match = folder.match(/waterdepth_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
          if (match) {
            const [_, year, month, day, hour, minute, second] = match;
            return {
              time: folder,
              display: `${year}-${month}-${day} ${hour}:${minute}`
            };
          }
          return null;
        }).filter(Boolean);
        
        // 按时间排序
        timesteps.sort((a, b) => a.time.localeCompare(b.time));
        
        setFloodTimestamps(timesteps);
        
        // 如果有时间戳且当前没有选择，设置第一个作为默认值
        if (timesteps.length > 0 && !currentTimestep) {
          setCurrentTimestep(timesteps[0]);
        }
      } catch (error) {
        console.error('Error loading flood timestamps:', error);
        // 使用硬编码的回退值
        setFloodTimestamps([{
          time: 'waterdepth_20221024_000000',
          display: '2022-10-24 00:00'
        }]);
      }
    };
    
    loadFloodTimestamps();
  }, []);

  // Load and filter precipitation data
  useEffect(() => {
    const loadPrecipitationData = async () => {
      try {
        const response = await fetch(PREC);
        const data = await response.json();
        // Filter out data points where precipitation is 0
        const filteredData = data.filter(item => item.precipitation > 0);
        setPrecipitationData(filteredData);
      } catch (error) {
        console.error('Error loading precipitation data:', error);
      }
    };

    loadPrecipitationData();
  }, []);

  // Load hierarchical infrastructure data
  useEffect(() => {
    const loadHierarchicalInfrastructureData = async () => {
      try {
        // 如果没有当前时间点，加载基本数据
        if (!currentTimestep) {
        const response = await fetch(HIERARCHICAL_INFRASTRUCTURE);
        const data = await response.json();
        setInfrastructureData(data);
        console.log("Loaded base infrastructure data");
        } else {
          // 如果有当前时间点，加载对应的时序数据
          const timeStr = currentTimestep.time;
          console.log(`Loading infrastructure data for time: ${timeStr}`);
          
          // 处理时间戳格式，从waterdepth_YYYYMMDD_HHMMSS提取YYYYMMDD_HHMMSS
          let infrastructureTimeStr = timeStr;
          if (timeStr.startsWith('waterdepth_')) {
            infrastructureTimeStr = timeStr.substring('waterdepth_'.length);
          }
          
          const response = await fetch(`${TIME_SERIES_INFRASTRUCTURE_BASE}${infrastructureTimeStr}.json`);
          
          // 如果时序数据不存在，则回退到基本数据
          if (!response.ok) {
            console.warn(`Time series infrastructure data for ${infrastructureTimeStr} not found, using base data`);
            const baseResponse = await fetch(HIERARCHICAL_INFRASTRUCTURE);
            const baseData = await baseResponse.json();
            setInfrastructureData(baseData);
          } else {
            const data = await response.json();
            // 打印一些状态信息
            const statusCounts = {
              operational: 0,
              warning: 0,
              down: 0
            };
            
            // 检查发电厂状态
            data.infrastructure_hierarchy.level_1_power_plants.forEach(plant => {
              statusCounts[plant.status] = (statusCounts[plant.status] || 0) + 1;
            });
            
            // 检查变电站状态
            data.infrastructure_hierarchy.level_2_substations.forEach(substation => {
              statusCounts[substation.status] = (statusCounts[substation.status] || 0) + 1;
            });
            
            // 检查变压器状态
            data.infrastructure_hierarchy.level_3_transformers.forEach(transformer => {
              statusCounts[transformer.status] = (statusCounts[transformer.status] || 0) + 1;
            });
            
            // 检查电缆状态
            data.hierarchical_power_cables.features.forEach(cable => {
              statusCounts[cable.properties.status] = (statusCounts[cable.properties.status] || 0) + 1;
            });
            
            console.log(`Loaded infrastructure data for time: ${infrastructureTimeStr}`, statusCounts);
            setInfrastructureData(data);
          }
        }
      } catch (error) {
        console.error('Error loading hierarchical infrastructure data:', error);
        // 出错时尝试加载基本数据
        try {
          const response = await fetch(HIERARCHICAL_INFRASTRUCTURE);
          const data = await response.json();
          setInfrastructureData(data);
        } catch (fallbackError) {
          console.error('Failed to load fallback data:', fallbackError);
        }
      }
    };

    loadHierarchicalInfrastructureData();
  }, [currentTimestep]);

  // Animation loop for power flow effect
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => (prev + 1) % 360); // 360 frame cycle for smoother animation
    };

    const interval = setInterval(animate, 30); // Update every 30ms for 33 FPS
    return () => clearInterval(interval);
  }, []);

  // Generate particles along power lines
  const generateParticles = useCallback((powerLines) => {
    if (!powerLines || !powerLines.features) return [];

    const particles = [];
    
    powerLines.features.forEach((line, lineIndex) => {
      // 检查电缆状态，如果是down则不生成粒子
      const status = line.properties.status;
      if (status === 'down') return;
      
      // 创建弧形路径
      const arcPath = createArcPath(line.geometry.coordinates);
      
      // 获取状态对应的颜色
      const statusColor = getStatusColor(status);
      
      // 为每段路径创建粒子
      for (let i = 0; i < arcPath.length - 1; i++) {
        const [start, end] = [arcPath[i], arcPath[i + 1]];
        const particleCount = 3; // 每段路径上的粒子数量
        
        for (let j = 0; j < particleCount; j++) {
          particles.push({
            id: `${lineIndex}-${i}-${j}`,
            startPoint: start,
            endPoint: end,
            lineIndex,
            segmentIndex: i,
            particleIndex: j,
            phase: (j / particleCount) * 2 * Math.PI, // 不同相位的粒子
            color: statusColor
          });
        }
      }
    });

    return particles;
  }, []);

  // Update particles based on power data
  useEffect(() => {
    if (infrastructureData && infrastructureData.hierarchical_power_cables && layerVisibility.power) {
      const particles = generateParticles(infrastructureData.hierarchical_power_cables);
      setPowerParticles(particles);
    } else {
      setPowerParticles([]);
    }
  }, [infrastructureData, layerVisibility.power, generateParticles]);

  // Function to interpolate particle positions
  const interpolatePosition = (start, end, t) => {
    // 线性插值三维坐标
    return [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
      start[2] + (end[2] - start[2]) * t
    ];
  };

  // Generate particle positions for current animation frame
  const getCurrentParticlePositions = useCallback(() => {
    return powerParticles.map(particle => {
      const timeScale = animationFrame * 0.02;
      const t = ((timeScale + particle.phase) % (2 * Math.PI)) / (2 * Math.PI);
      const position = interpolatePosition(particle.startPoint, particle.endPoint, t);
      
      // 处理颜色，现在particle.color已经是数组形式
      let rgb = particle.color || [255, 255, 0]; // 使用粒子颜色，默认黄色
      
      return {
        ...particle,
        position,
        color: rgb,
        alpha: Math.sin(t * Math.PI) * 0.8 + 0.2 // Fade in/out effect
      };
    });
  }, [powerParticles, animationFrame]);

  // Generate electrical arc effects at junction points
  const getElectricalArcs = useCallback(() => {
    if (!infrastructureData || !infrastructureData.hierarchical_power_cables || !infrastructureData.hierarchical_power_cables.features) return [];
    
    const arcs = [];
    const junctionPoints = new Map();
    
    // Find junction points (where lines intersect)
    infrastructureData.hierarchical_power_cables.features.forEach((line, lineIndex) => {
      const coordinates = line.geometry.coordinates;
      const status = line.properties.status;
      const statusColor = getStatusColor(status);
      
      coordinates.forEach((coord, coordIndex) => {
        const key = `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
        if (!junctionPoints.has(key)) {
          junctionPoints.set(key, {
            position: [coord[0], coord[1], 500], // 添加高度
            count: 0,
            color: statusColor,
            status: status
          });
        } else {
          // 如果连接点已存在，且当前线路状态为down，则更新连接点状态为down
          const existingPoint = junctionPoints.get(key);
          if (status === 'down' && existingPoint.status !== 'down') {
            existingPoint.status = 'down';
            existingPoint.color = statusColor;
          } else if (status === 'warning' && existingPoint.status === 'operational') {
            existingPoint.status = 'warning';
            existingPoint.color = statusColor;
          }
        }
        junctionPoints.get(key).count++;
      });
    });
    
    // Create arcs at junction points with multiple connections
    junctionPoints.forEach(point => {
      // 如果连接点状态为down，不生成电弧效果
      if (point.count > 1 && point.status !== 'down') {
        // 根据连接数量调整电弧强度
        const arcIntensity = Math.min(0.2 + point.count * 0.1, 0.8);
        
        arcs.push({
          position: point.position,
          intensity: arcIntensity,
          color: point.color
        });
      }
    });
    
    return arcs;
  }, [infrastructureData, animationFrame]);

  // Function to adjust model scale based on zoom level to maintain fixed size
  const getModelScale = (baseScale) => {
    const zoomScale = Math.pow(2, INITIAL_VIEW_STATE.zoom - zoom);
    return baseScale / zoomScale;
  };

  // Function to get model orientation with animation
  const getModelOrientation = (baseRotation, modelIndex, modelType) => {
    // 简化方向计算，避免WebGL错误
    const oscillation = Math.sin(animationFrame * 0.01 + modelIndex) * 3;
    
    // 不同类型的模型使用不同的基础旋转
    let yRotation = baseRotation;
    
    if (modelType === 'power_plant') {
      yRotation = 90;
    } else if (modelType === 'substation') {
      yRotation = 45;
    } else if (modelType === 'transformer') {
      yRotation = 30;
    }
    
    // 返回欧拉角（弧度制）
    return [0, (yRotation * Math.PI) / 180, 0];
  };

  const onZoom = useCallback(({viewState}) => {
    setZoom(viewState.zoom);
  }, []);

  // 计算模型大小的函数，用于ScenegraphLayer
  const calculateModelSize = (baseSize) => {
    return baseSize * (Math.pow(2, INITIAL_VIEW_STATE.zoom - zoom));
  };

  const handleVisibilityChange = (layerName, isVisible) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerName]: isVisible
    }));
  };

  const handleTimestepChange = useCallback((timestep) => {
    setCurrentTimestep(timestep);
    // 当时间步变化时，重新加载基础设施数据
  }, []);

  // 当zoom状态改变时，强制重新渲染
  useEffect(() => {
    // 这个空的useEffect会在zoom状态改变时触发重新渲染
  }, [zoom]);

  // 创建弧形电缆路径的辅助函数
  const createArcPath = (coordinates) => {
    if (coordinates.length < 2) return coordinates;
    
    const result = [];
    for (let i = 0; i < coordinates.length - 1; i++) {
      const start = coordinates[i];
      const end = coordinates[i + 1];
      
      // 添加起点
      result.push([start[0], start[1], 30]);
      
      // 计算中间点，形成弧形
      const midX = (start[0] + end[0]) / 2;
      const midY = (start[1] + end[1]) / 2;
      
      // 计算起点和终点之间的距离
      const distance = Math.sqrt(
        Math.pow(end[0] - start[0], 2) + 
        Math.pow(end[1] - start[1], 2)
      );
      
      // 根据距离调整弧形的下垂程度
      const sagFactor = Math.min(distance * 0.05, 10); // 限制最大下垂
      const midZ = 30 - sagFactor; // 中点高度低于两端
      
      // 添加中间点
      result.push([midX, midY, midZ]);
    }
    
    // 添加终点
    const lastPoint = coordinates[coordinates.length - 1];
    result.push([lastPoint[0], lastPoint[1], 30]);
    
    return result;
  };

  const layers = [
    // Only create precipitation layer if data is loaded
    precipitationData && new ColumnLayer({
      id: 'prec',
      data: precipitationData, // Use filtered precipitation data
      diskResolution: 4,
      angle: 45,
      radius: 100,
      extruded: true,
      pickable: true,
      elevationScale: 5 * Math.pow(2, INITIAL_VIEW_STATE.zoom - zoom),
      getPosition: d => d.coordinates,
      getFillColor: d => [
        255 - d.precipitation * 0.9, 
        255 - d.precipitation, 
        d.precipitation * 2, 
        128],
      getElevation: f => f.precipitation,
      visible: layerVisibility.prec
    }),

    // Level 4: Communication Towers (using GLTF model)
    infrastructureData && new ScenegraphLayer({
      id: 'level4-towers',
      data: infrastructureData.infrastructure_hierarchy.level_4_communication_towers,
      scenegraph: TOWER_MODEL,
      getPosition: d => [d.coordinates[0], d.coordinates[1], 0],
      getColor: d => getStatusColor(d.status),
      sizeScale: 0.3,
      getOrientation: [0,0,90],
      pickable: true,
      visible: layerVisibility.infrastructure
    }),

    // Level 1: Power Plants (using GLTF model)
    infrastructureData && new ScenegraphLayer({
      id: 'level1-power-plants',
      data: infrastructureData.infrastructure_hierarchy.level_1_power_plants,
      scenegraph: POWER_PLANT_MODEL,
      getPosition: d => [d.coordinates[0], d.coordinates[1], 0],
      getColor: d => getStatusColor(d.status),
      getOrientation: [0,0,90],
      sizeScale: 50,
      pickable: true,
      visible: layerVisibility.infrastructure
    }),

    // Level 2: Substations (using GLTF model)
    infrastructureData && new ScenegraphLayer({
      id: 'level2-substations',
      data: infrastructureData.infrastructure_hierarchy.level_2_substations,
      scenegraph: SUBSTATION_MODEL,
      getPosition: d => [d.coordinates[0], d.coordinates[1], 0],
      getColor: d => getStatusColor(d.status),
      getOrientation: [0,0,90],
      sizeScale: 50,
      pickable: true,
      visible: layerVisibility.infrastructure
    }),

    // Level 3: Transformers (using GLTF model)
    infrastructureData && new ScenegraphLayer({
      id: 'level3-transformers',
      data: infrastructureData.infrastructure_hierarchy.level_3_transformers,
      scenegraph: TRANSFORMER_MODEL,
      getPosition: d => [d.coordinates[0], d.coordinates[1], 0],
      getColor: d => getStatusColor(d.status),
      getOrientation: [0,0,90],
      sizeScale: 50,
      pickable: true,
      visible: layerVisibility.infrastructure
    }),

    // Hierarchical Cable Glow Effect (outer layer)
    infrastructureData && infrastructureData.hierarchical_power_cables && new PathLayer({
      id: 'hierarchical-cable-glow',
      data: infrastructureData.hierarchical_power_cables.features.filter(d => d.properties.status !== 'down'),
      pickable: false,
      widthScale: 1,
      widthMinPixels: 15,
      widthMaxPixels: 25,
      getPath: d => {
        // 创建弧形悬空电缆
        return createArcPath(d.geometry.coordinates);
      },
      getColor: d => {
        // 创建基于层级的发光效果
        const status = d.properties.status;
        let baseColor = getStatusColorString(status);
        let rgb = [255, 255, 0]; // 默认黄色发光
        
        if (baseColor && baseColor.startsWith('rgb')) {
          const matches = baseColor.match(/\d+/g);
          rgb = matches ? matches.map(Number) : [255, 255, 0];
        }
        
        const timeScale = animationFrame * 0.05;
        const glowIntensity = Math.sin(timeScale * 0.5) * 0.3 + 0.4; // 发光强度
        
        return [
          Math.floor(rgb[0] * 0.8),
          Math.floor(rgb[1] * 0.8),
          Math.floor(rgb[2] * 0.2),
          Math.floor(60 * glowIntensity) // 低透明度创建发光效果
        ];
      },
      getWidth: d => {
        // 基于电缆类型的宽度
        const cableType = d.properties.cable_type;
        let baseWidth = 20;
        if (cableType === 'transmission') baseWidth = 25;
        else if (cableType === 'distribution') baseWidth = 20;
        else if (cableType === 'service') baseWidth = 15;
        
        const timeScale = animationFrame * 0.05;
        const pulse = Math.sin(timeScale * 0.3) * 0.4 + 0.6;
        return baseWidth * pulse;
      },
      updateTriggers: {
        getColor: animationFrame,
        getWidth: animationFrame
      },
      visible: layerVisibility.power
    }),

    // Hierarchical Cable Flow Animation
    infrastructureData && infrastructureData.hierarchical_power_cables && new PathLayer({
      id: 'hierarchical-cable-flow',
      data: infrastructureData.hierarchical_power_cables.features.filter(d => d.properties.status !== 'down'),
      pickable: true,
      widthScale: 1,
      widthMinPixels: 6,
      widthMaxPixels: 12,
      getPath: d => {
        // 创建弧形悬空电缆
        return createArcPath(d.geometry.coordinates);
      },
      getColor: d => {
        // 创建基于层级的流动颜色效果
        const status = d.properties.status;
        let baseColor = getStatusColorString(status);
        let rgb = getStatusColor(status);
        
        if (baseColor && baseColor.startsWith('rgb')) {
          const matches = baseColor.match(/\d+/g);
          rgb = matches ? matches.map(Number) : rgb;
        }
        
        // 创建流动效果
        const timeScale = animationFrame * 0.05;
        const intensity = Math.sin(timeScale) * 0.4 + 0.6; // 0.2-1之间的正弦波
        const flowIntensity = Math.sin(timeScale * 1.5 + (d.properties.from_level || 0) * 0.5) * 0.3 + 0.7; // 不同层级的相位偏移
        
        return [
          Math.floor(rgb[0] * flowIntensity),
          Math.floor(rgb[1] * flowIntensity),
          Math.floor(rgb[2] * flowIntensity),
          Math.floor(255 * intensity)
        ];
      },
      getWidth: d => {
        // 基于电缆类型的宽度
        const cableType = d.properties.cable_type;
        let baseWidth = 6;
        if (cableType === 'transmission') baseWidth = 10;
        else if (cableType === 'distribution') baseWidth = 8;
        else if (cableType === 'service') baseWidth = 6;
        
        const timeScale = animationFrame * 0.05;
        const pulse = Math.sin(timeScale * 0.8) * 0.25 + 0.75; // 更温和的脉冲效果
        return baseWidth * pulse;
      },
      // 使用动画帧创建流动效果
      updateTriggers: {
        getColor: animationFrame,
        getWidth: animationFrame
      },
      visible: layerVisibility.power
    }),

    // Hierarchical Cable Background (static)
    infrastructureData && infrastructureData.hierarchical_power_cables && new PathLayer({
      id: 'hierarchical-cable-background',
      data: infrastructureData.hierarchical_power_cables.features,
      pickable: true,
      widthScale: 1,
      widthMinPixels: 3,
      widthMaxPixels: 6,
      getPath: d => {
        // 创建弧形悬空电缆
        return createArcPath(d.geometry.coordinates);
      },
      getColor: d => {
        // 从 status 属性获取颜色
        const status = d.properties.status;
        
        // 如果状态为down，使用暗红色
        if (status === 'down') {
          return [100, 0, 0, 100]; // 暗红色，低透明度
        }
        
        const color = getStatusColorString(status);
        
        if (color && color.startsWith('rgb')) {
          const matches = color.match(/\d+/g);
          return matches ? matches.map(Number).concat([100]) : [255, 0, 0, 100];
        }
        return [255, 0, 0, 100]; // 默认红色，低透明度
      },
      getWidth: d => {
        // 基于电缆类型的宽度
        const cableType = d.properties.cable_type;
        if (cableType === 'transmission') return 6;
        else if (cableType === 'distribution') return 4;
        else if (cableType === 'service') return 3;
        return 4;
      },
      visible: layerVisibility.power
    }),

    // Power particles layer
    powerParticles.length > 0 && new ScatterplotLayer({
      id: 'power-particles',
      data: getCurrentParticlePositions(),
      pickable: false,
      opacity: 0.8,
      stroked: false,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 3,
      radiusMaxPixels: 8,
      getPosition: d => d.position,
      getRadius: d => {
        // 创建脉冲效果
        const pulse = Math.sin(animationFrame * 0.1 + d.particleIndex) * 0.3 + 0.7;
        return 5 * pulse;
      },
      getFillColor: d => {
        // 使用粒子的颜色，该颜色来自电缆状态
        const intensity = d.alpha * 255;
        const rgb = d.color || [0, 255, 0];
        
        return [
          Math.floor(rgb[0] * d.alpha),
          Math.floor(rgb[1] * d.alpha),
          Math.floor(rgb[2] * d.alpha),
          Math.floor(intensity)
        ];
      },
      updateTriggers: {
        getPosition: animationFrame,
        getRadius: animationFrame,
        getFillColor: animationFrame
      },
      visible: layerVisibility.power
    }),

    // 移除电弧效果层

    // Flood TileLayer
    currentTimestep && new TileLayer({
      id: 'flood',
      data: `${FLOOD_TILES_BASE}/${currentTimestep.time}/{z}/{x}/{y}.png`,
      minZoom: 0,
      maxZoom: 14,
      tileSize: 256,
      renderSubLayers: props => {
        const { boundingBox } = props.tile;
        
        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]]
        });
      },
      opacity: 0.5,
      visible: layerVisibility.flood
    })
  ].filter(Boolean);

  function getTooltip({ object }) {
    if (!object) return null;

    if (object.precipitation) {
      // This is for the ColumnLayer precipitation
      return `Precipitation: ${object.precipitation} mm`;
    } else if (object.code && object.structures) {
      // This is for the Mesh tower
      return `Device No.: ${object.code}
      Address: ${object.address}
      Structures: ${object.structures}
      Networks: ${object.networks}
      Impact Duration: ${object.impact}
      Backup Power: ${object.backup}`;
    } else if (object.hierarchy_level === 1) {
      // This is for power plants (Level 1)
      return `🏭 Level 1: ${object.name}
      Code: ${object.code}
      Type: ${object.type.toUpperCase()}
      Capacity: ${object.capacity}
      Output Voltage: ${object.voltage_output}
      Status: ${object.status}
      Operator: ${object.operator}
      Fuel: ${object.fuel_type}
      Efficiency: ${(object.efficiency * 100).toFixed(1)}%
      Risk Level: ${object.risk_level}`;
    } else if (object.hierarchy_level === 2) {
      // This is for substations (Level 2)
      return `🏗️ Level 2: ${object.name}
      Code: ${object.code}
      Type: ${object.type.toUpperCase()}
      Input Voltage: ${object.voltage_input}
      Output Voltage: ${object.voltage_output}
      Capacity: ${object.capacity}
      Status: ${object.status}
      Risk Level: ${object.risk_level}`;
    } else if (object.hierarchy_level === 3) {
      // This is for transformers (Level 3)
      return `⚡ Level 3: Transformer ${object.code}
      Type: ${object.type.replace('_', ' ').toUpperCase()}
      Input Voltage: ${object.voltage_input}
      Output Voltage: ${object.voltage_output}
      Capacity: ${object.capacity}
      Status: ${object.status}
      Risk Level: ${object.risk_level}`;
    } else if (object.hierarchy_level === 4) {
      // This is for communication towers (Level 4)
      return `🗼 Level 4: Communication Tower
      Code: ${object.code}
      Address: ${object.address}
      Structure: ${object.structures}
      Network: ${object.networks}
      Power Consumption: ${object.power_consumption}
      Impact Duration: ${object.impact}
      Backup Power: ${object.backup}
      Risk Level: ${object.risk}`;
    } else if (object.properties && object.properties.cable_id) {
      // This is for hierarchical power cables
      return `🔌 Power Cable ${object.properties.cable_id}
      From: ${object.properties.from} (Level ${object.properties.from_level})
      To: ${object.properties.to} (Level ${object.properties.to_level})
      Voltage: ${object.properties.voltage}
      Type: ${object.properties.cable_type.toUpperCase()}
      Capacity: ${object.properties.capacity}
      Status: ${object.properties.status}
      Current Flow: ${layerVisibility.power ? 'Active' : 'Inactive'}`;
    }
  }

  return (
    <MapGL
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle={MAP_STYLE}
      mapboxAccessToken={MAPBOX_TOKEN}
      minZoom={8}
      maxZoom={17}
      maxPitch={75}
      onZoom={onZoom}
    >
      <DeckGLOverlay layers={layers} getTooltip={getTooltip} />

      <NavigationControl position="top-left" />
      <PowerResilienceCard 
        layerVisibility={layerVisibility}
        onVisibilityChange={handleVisibilityChange}
      />
      <FloodTimelineControl 
        onTimestepChange={handleTimestepChange}
        isVisible={layerVisibility.flood}
        availableTimesteps={floodTimestamps}
      />
    </MapGL>
  );
}

/* global document */
const container = document.body.appendChild(document.createElement('div'));
createRoot(container).render(<Root />);
