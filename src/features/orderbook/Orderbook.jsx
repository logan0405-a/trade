// Orderbook.jsx
import React from "react";
import { Paper, Typography, Box } from "@mui/material";

const Orderbook = () => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        height: "100%", // 填满父容器高度
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Order Book
      </Typography>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.paper",
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Real-time order book will be displayed here
        </Typography>
      </Box>
    </Paper>
  );
};

export default Orderbook;
