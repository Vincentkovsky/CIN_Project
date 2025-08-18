import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

// 生成默认时间戳（向后兼容）- 移到组件外部避免重复创建
function generateDefaultTimesteps() {
  const baseDate = '20221008'; // 与时序数据文件名匹配
  const result = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${baseDate}_${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}00`;
      result.push({
        time: timeStr,
        display: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      });
    }
  }
  return result;
}

const FloodTimelineControl = ({ onTimestepChange, isVisible, availableTimesteps = [] }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimestep, setCurrentTimestep] = useState(0);
  const [playInterval, setPlayInterval] = useState(null);
  const [dynamicWidth, setDynamicWidth] = useState('calc(100vw - 400px)');
  const containerRef = useRef(null);

  // 使用 useMemo 缓存时间戳数组，避免无限重新创建
  const timesteps = useMemo(() => {
    return availableTimesteps.length > 0 
      ? availableTimesteps 
      : generateDefaultTimesteps();
  }, [availableTimesteps]);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      if (playInterval) {
        clearInterval(playInterval);
        setPlayInterval(null);
      }
    } else {
      // Play
      setIsPlaying(true);
      const interval = setInterval(() => {
        setCurrentTimestep(prev => {
          const next = (prev + 1) % timesteps.length;
          return next;
        });
      }, 1000); // 1 second interval
      setPlayInterval(interval);
    }
  }, [isPlaying, playInterval, timesteps.length]);

  const handleTimestepClick = useCallback((index) => {
    setCurrentTimestep(index);
    // If playing, pause it
    if (isPlaying) {
      setIsPlaying(false);
      if (playInterval) {
        clearInterval(playInterval);
        setPlayInterval(null);
      }
    }
  }, [isPlaying, playInterval]);

  // 使用 useCallback 缓存计算宽度函数
  const calculateWidth = useCallback(() => {
    if (!containerRef.current) return;
    
    // 计算内容实际需要的宽度
    const buttonWidth = 48; // IconButton 大约宽度
    const timeDisplayWidth = 80; // Typography minWidth
    const gap = 16; // mr: 2 * 8px
    const timelineDotsWidth = timesteps.length * 12 + (timesteps.length - 1) * 8; // 12px dot + 8px gap
    const padding = 32; // padding: 2 * 16px
    
    const contentWidth = buttonWidth + gap + timeDisplayWidth + gap + timelineDotsWidth + padding;
    const maxWidth = window.innerWidth - 400; // 窗口宽度 - 400px
    
    // 如果内容宽度小于最大宽度，使用内容宽度；否则使用最大宽度
    if (contentWidth < maxWidth && contentWidth >= 400) {
      setDynamicWidth(`${contentWidth}px`);
    } else {
      setDynamicWidth('calc(100vw - 400px)');
    }
  }, [timesteps.length]);

  // 计算动态宽度
  useEffect(() => {
    calculateWidth();
    
    // 监听窗口大小变化
    window.addEventListener('resize', calculateWidth);
    
    return () => window.removeEventListener('resize', calculateWidth);
  }, [calculateWidth]);

  // 当availableTimesteps改变时，重置当前时间步
  useEffect(() => {
    if (availableTimesteps.length > 0) {
      setCurrentTimestep(0);
    }
  }, [availableTimesteps]);

  // Notify parent component of timestep change
  useEffect(() => {
    if (onTimestepChange && timesteps[currentTimestep]) {
      onTimestepChange(timesteps[currentTimestep]);
    }
  }, [currentTimestep, timesteps]); // 移除 onTimestepChange 依赖，避免无限循环

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (playInterval) {
        clearInterval(playInterval);
      }
    };
  }, [playInterval]);

  if (!isVisible) return null;

  return (
    <Box 
      ref={containerRef}
      sx={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 2,
        borderRadius: 2,
        boxShadow: 3,
        zIndex: 10,
        width: dynamicWidth,
        minWidth: 400,
        overflowX: 'auto'
      }}>
      {/* Play/Pause Button */}
      <IconButton 
        onClick={handlePlay}
        sx={{ mr: 2 }}
        color="primary"
      >
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>

      {/* Current Time Display */}
      <Typography variant="body2" sx={{ mr: 2, minWidth: 80 }}>
        {timesteps[currentTimestep]?.display || "00:00"}
      </Typography>

      {/* Timeline Dots */}
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        alignItems: 'center',
        overflowX: 'auto',
        paddingY: 1
      }}>
        {timesteps.map((timestep, index) => (
          <Box
            key={timestep.time}
            onClick={() => handleTimestepClick(index)}
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: index === currentTimestep ? '#2196f3' : '#ccc',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              flexShrink: 0,
              '&:hover': {
                backgroundColor: index === currentTimestep ? '#1976d2' : '#999'
              }
            }}
            title={timestep.display}
          />
        ))}
      </Box>
    </Box>
  );
};

export default FloodTimelineControl; 