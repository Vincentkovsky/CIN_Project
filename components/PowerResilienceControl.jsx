import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, Typography, Switch, Box, IconButton, Fade } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DownloadIcon from '@mui/icons-material/Download';

const PowerResilienceCard = ({ layerVisibility, onVisibilityChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const anchorRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const handleSwitchChange = (layerName) => (event) => {
    onVisibilityChange(layerName, event.target.checked);
  };

  // Generate mock data for each layer
  const generateMockData = (layerType) => {
    const timestamp = new Date().toISOString();
    
    switch (layerType) {
      case 'prec':
        // Generate precipitation mock data
        const precipitationData = [];
        for (let i = 0; i < 100; i++) {
          precipitationData.push({
            id: `prec_${i + 1}`,
            precipitation: Math.random() * 50, // 0-50mm
            coordinates: [
              147.1 + Math.random() * 0.5, // longitude around Wagga Wagga
              -35.2 + Math.random() * 0.3   // latitude around Wagga Wagga
            ],
            timestamp: timestamp,
            location: `Location ${i + 1}`,
            intensity: Math.random() > 0.7 ? 'heavy' : Math.random() > 0.4 ? 'moderate' : 'light'
          });
        }
        return {
          metadata: {
            layer_type: 'precipitation',
            generated_at: timestamp,
            total_points: precipitationData.length,
            units: 'mm',
            description: 'Mock precipitation data for visualization testing'
          },
          data: precipitationData
        };

      case 'flood':
        // Generate flood prediction mock data
        const floodData = [];
        const floodZones = ['low_risk', 'moderate_risk', 'high_risk', 'extreme_risk'];
        for (let i = 0; i < 50; i++) {
          floodData.push({
            id: `flood_zone_${i + 1}`,
            risk_level: floodZones[Math.floor(Math.random() * floodZones.length)],
            water_depth: Math.random() * 3, // 0-3 meters
            coordinates: [
              147.2 + Math.random() * 0.4,
              -35.15 + Math.random() * 0.25
            ],
            affected_area: Math.random() * 1000, // square meters
            timestamp: timestamp,
            prediction_confidence: Math.random() * 100,
            evacuation_required: Math.random() > 0.8
          });
        }
        return {
          metadata: {
            layer_type: 'flood_prediction',
            generated_at: timestamp,
            total_zones: floodData.length,
            prediction_horizon: '24_hours',
            description: 'Mock flood prediction data with risk zones and water depth estimates'
          },
          data: floodData
        };

      case 'power':
        // Generate power supply mock data
        const powerData = {
          power_lines: [],
          power_flow: []
        };
        
        // Generate power lines
        for (let i = 0; i < 30; i++) {
          const startCoords = [147.1 + Math.random() * 0.6, -35.3 + Math.random() * 0.4];
          const endCoords = [startCoords[0] + (Math.random() - 0.5) * 0.2, startCoords[1] + (Math.random() - 0.5) * 0.2];
          
          powerData.power_lines.push({
            id: `power_line_${i + 1}`,
            from_station: `station_${Math.floor(Math.random() * 10) + 1}`,
            to_station: `station_${Math.floor(Math.random() * 10) + 1}`,
            voltage: [132, 330, 500][Math.floor(Math.random() * 3)], // kV
            capacity: Math.random() * 1000 + 100, // MW
            current_load: Math.random() * 80 + 10, // percentage
            status: Math.random() > 0.1 ? 'operational' : Math.random() > 0.5 ? 'warning' : 'down',
            coordinates: [startCoords, endCoords],
            timestamp: timestamp
          });
        }

        // Generate power flow data
        for (let i = 0; i < 20; i++) {
          powerData.power_flow.push({
            id: `flow_${i + 1}`,
            source: `generator_${Math.floor(Math.random() * 5) + 1}`,
            destination: `load_center_${Math.floor(Math.random() * 8) + 1}`,
            power_mw: Math.random() * 500 + 50,
            direction: Math.random() > 0.5 ? 'forward' : 'reverse',
            efficiency: Math.random() * 0.15 + 0.85, // 85-100%
            timestamp: timestamp
          });
        }

        return {
          metadata: {
            layer_type: 'power_supply',
            generated_at: timestamp,
            total_lines: powerData.power_lines.length,
            total_flows: powerData.power_flow.length,
            description: 'Mock power grid data including transmission lines and power flow'
          },
          data: powerData
        };

      case 'infrastructure':
        // Generate infrastructure hierarchy mock data
        const infraData = {
          power_plants: [],
          substations: [],
          transformers: [],
          communication_towers: []
        };

        // Generate power plants
        for (let i = 0; i < 5; i++) {
          infraData.power_plants.push({
            id: `pp_${i + 1}`,
            name: `Power Plant ${i + 1}`,
            type: ['thermal', 'solar', 'wind', 'hydro'][Math.floor(Math.random() * 4)],
            capacity: Math.random() * 500 + 100, // MW
            current_output: Math.random() * 80 + 10, // percentage
            status: Math.random() > 0.1 ? 'operational' : Math.random() > 0.5 ? 'warning' : 'down',
            coordinates: [147.1 + Math.random() * 0.6, -35.3 + Math.random() * 0.4],
            operator: `Operator ${Math.floor(Math.random() * 3) + 1}`,
            fuel_type: ['natural_gas', 'solar', 'wind', 'water'][Math.floor(Math.random() * 4)],
            efficiency: Math.random() * 0.3 + 0.6, // 60-90%
            timestamp: timestamp
          });
        }

        // Generate substations
        for (let i = 0; i < 10; i++) {
          infraData.substations.push({
            id: `sub_${i + 1}`,
            name: `Substation ${i + 1}`,
            voltage_input: [330, 500][Math.floor(Math.random() * 2)], // kV
            voltage_output: [132, 220][Math.floor(Math.random() * 2)], // kV
            capacity: Math.random() * 300 + 50, // MW
            current_load: Math.random() * 90 + 5, // percentage
            status: Math.random() > 0.15 ? 'operational' : Math.random() > 0.5 ? 'warning' : 'down',
            coordinates: [147.15 + Math.random() * 0.5, -35.25 + Math.random() * 0.35],
            timestamp: timestamp
          });
        }

        // Generate transformers
        for (let i = 0; i < 20; i++) {
          infraData.transformers.push({
            id: `trans_${i + 1}`,
            name: `Transformer ${i + 1}`,
            voltage_input: [132, 66][Math.floor(Math.random() * 2)], // kV
            voltage_output: [11, 22][Math.floor(Math.random() * 2)], // kV
            capacity: Math.random() * 50 + 5, // MW
            current_load: Math.random() * 85 + 10, // percentage
            status: Math.random() > 0.2 ? 'operational' : Math.random() > 0.6 ? 'warning' : 'down',
            coordinates: [147.2 + Math.random() * 0.4, -35.2 + Math.random() * 0.3],
            timestamp: timestamp
          });
        }

        // Generate communication towers
        for (let i = 0; i < 15; i++) {
          infraData.communication_towers.push({
            id: `tower_${i + 1}`,
            name: `Communication Tower ${i + 1}`,
            height: Math.random() * 50 + 20, // meters
            coverage_radius: Math.random() * 10 + 5, // km
            signal_strength: Math.random() * 30 + 70, // percentage
            status: Math.random() > 0.1 ? 'operational' : Math.random() > 0.6 ? 'warning' : 'down',
            coordinates: [147.25 + Math.random() * 0.3, -35.18 + Math.random() * 0.25],
            networks: ['4G', '5G', 'LTE'][Math.floor(Math.random() * 3)],
            power_consumption: Math.random() * 5 + 2, // kW
            timestamp: timestamp
          });
        }

        return {
          metadata: {
            layer_type: 'infrastructure_hierarchy',
            generated_at: timestamp,
            total_power_plants: infraData.power_plants.length,
            total_substations: infraData.substations.length,
            total_transformers: infraData.transformers.length,
            total_towers: infraData.communication_towers.length,
            description: 'Mock infrastructure hierarchy data with power generation and transmission assets'
          },
          data: infraData
        };

      default:
        return {
          metadata: {
            layer_type: 'unknown',
            generated_at: timestamp,
            description: 'Unknown layer type'
          },
          data: []
        };
    }
  };

  // Download function
  const downloadLayerData = (layerType) => {
    const mockData = generateMockData(layerType);
    const fileName = `${layerType}_data_${new Date().toISOString().split('T')[0]}.json`;
    
    // Create blob and download
    const blob = new Blob([JSON.stringify(mockData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    // 清除任何现有的延迟关闭
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // 稍微延迟显示，避免鼠标快速划过时误触发
    setTimeout(() => {
      setIsOpen(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    // 延迟关闭，给用户时间移动到弹出层
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handlePopupMouseEnter = () => {
    // 鼠标进入弹出层时，取消关闭
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handlePopupMouseLeave = () => {
    // 鼠标离开弹出层时，延迟关闭
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 设置按钮 */}
      <IconButton
        ref={anchorRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          boxShadow: 3,
          zIndex: 12,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
          },
          transition: 'all 0.2s ease-in-out',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
        size="large"
      >
        <SettingsIcon />
      </IconButton>

      {/* 浮动弹出层 */}
      <Box sx={{ position: 'relative' }}>
        <Fade in={isOpen} timeout={200}>
          <Card 
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
            sx={{ 
              position: 'fixed', 
              top: 70, // 设置按钮下方
              right: 16, 
              width: 320, 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              zIndex: 11,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              transform: 'translateY(0)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
              }
            }}
          >
              <CardContent sx={{ pb: '16px !important' }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 1
                }}>
                  Layer Control
                </Typography>
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  mb: 2, 
                  color: 'text.secondary',
                  lineHeight: 1.4
                }}>
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: 'rgb(97, 116, 255)', 
                    mr: 1.5,
                    borderRadius: 0.5,
                    boxShadow: '0 2px 4px rgba(97, 116, 255, 0.3)'
                  }} />
                  <Typography sx={{ flexGrow: 1, fontSize: '0.9rem' }}>Precipitation</Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => downloadLayerData('prec')}
                    sx={{ 
                      mr: 0.5, 
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  <Switch 
                    checked={layerVisibility.prec}
                    onChange={handleSwitchChange('prec')}
                    size="small"
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: 'warning.main', 
                    mr: 1.5,
                    borderRadius: 0.5,
                    boxShadow: '0 2px 4px rgba(255, 152, 0, 0.3)'
                  }} />
                  <Typography sx={{ flexGrow: 1, fontSize: '0.9rem' }}>Flood Prediction</Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => downloadLayerData('flood')}
                    sx={{ 
                      mr: 0.5, 
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  <Switch 
                    checked={layerVisibility.flood}
                    onChange={handleSwitchChange('flood')}
                    size="small"
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: 'rgb(123, 232, 56)', 
                    mr: 1.5,
                    borderRadius: 0.5,
                    boxShadow: '0 2px 4px rgba(123, 232, 56, 0.3)'
                  }} />
                  <Typography sx={{ flexGrow: 1, fontSize: '0.9rem' }}>Power Supply</Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => downloadLayerData('power')}
                    sx={{ 
                      mr: 0.5, 
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  <Switch 
                    checked={layerVisibility.power}
                    onChange={handleSwitchChange('power')}
                    size="small"
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    width: 20, 
                    height: 20, 
                    background: 'linear-gradient(135deg, rgb(255, 0, 0), rgb(255, 165, 0), rgb(255, 255, 0), rgb(0, 255, 0))', 
                    mr: 1.5,
                    borderRadius: 0.5,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }} />
                  <Typography sx={{ flexGrow: 1, fontSize: '0.9rem' }}>Infrastructure Hierarchy</Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => downloadLayerData('infrastructure')}
                    sx={{ 
                      mr: 0.5, 
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  <Switch 
                    checked={layerVisibility.infrastructure}
                    onChange={handleSwitchChange('infrastructure')}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Fade>
        </Box>
    </>
  );
};

export default PowerResilienceCard;