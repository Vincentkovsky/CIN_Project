import React, { useState, useEffect, useCallback } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

const FloodTimelineControl = ({ onTimestepChange, isVisible, availableTimesteps = [] }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimestep, setCurrentTimestep] = useState(0);
  const [playInterval, setPlayInterval] = useState(null);

  // 使用提供的时间戳或生成默认时间戳
  const timesteps = availableTimesteps.length > 0 
    ? availableTimesteps 
    : generateDefaultTimesteps();

  // 生成默认时间戳（向后兼容）
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
  }, [currentTimestep, onTimestepChange, timesteps]);

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
    <Box sx={{
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
      minWidth: 400,
      maxWidth: '80vw',
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