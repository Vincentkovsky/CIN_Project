import React from 'react';
import { Card, CardContent, Typography, Switch, Box } from '@mui/material';

const PowerResilienceCard = ({ layerVisibility, onVisibilityChange }) => {
  const handleSwitchChange = (layerName) => (event) => {
    onVisibilityChange(layerName, event.target.checked);
  };

  return (
    <Card sx={{ 
      position: 'fixed', 
      top: 16, 
      right: 16, 
      width: 300, 
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      boxShadow: 3,
      zIndex:11
    }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Hierarchical Infrastructure
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
          Power transmission hierarchy: Plants → Substations → Transformers → Towers
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ width: 24, height: 24, bgcolor: 'rgb(97, 116, 255)', mr: 1 }} />
          <Typography sx={{ flexGrow: 1 }}>Precipitation</Typography>
          <Switch 
            checked={layerVisibility.prec}
            onChange={handleSwitchChange('prec')}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ width: 24, height: 24, bgcolor: 'warning.main', mr: 1 }} />
          <Typography sx={{ flexGrow: 1 }}>Flood Prediction</Typography>
          <Switch 
            checked={layerVisibility.flood}
            onChange={handleSwitchChange('flood')}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ width: 24, height: 24, bgcolor: 'rgb(123, 232, 56)', mr: 1 }} />
          <Typography sx={{ flexGrow: 1 }}>Power Supply</Typography>
          <Switch 
            checked={layerVisibility.power}
            onChange={handleSwitchChange('power')}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ 
            width: 24, 
            height: 24, 
            background: 'linear-gradient(to right, rgb(255, 0, 0), rgb(255, 165, 0), rgb(255, 255, 0), rgb(0, 255, 0))', 
            mr: 1,
            borderRadius: 1
          }} />
          <Typography sx={{ flexGrow: 1 }}>Infrastructure Hierarchy</Typography>
          <Switch 
            checked={layerVisibility.infrastructure}
            onChange={handleSwitchChange('infrastructure')}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default PowerResilienceCard;