// TradingViewChart.jsx
import React from "react";
import { Paper, Typography, Box } from "@mui/material";

const TradingViewChart = () => {
  return (
    <Paper
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          p: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle1" fontWeight="medium">
          Trading Chart
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          TradingView Chart will be integrated here
        </Typography>
      </Box>
    </Paper>
  );
};

export default TradingViewChart;
