// TradeForm.jsx
import React from "react";
import { Paper, Typography, Box } from "@mui/material";

const TradeForm = () => {
  return (
    <Paper
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="h6">Trade Form</Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
          p: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Limit order trading form will be implemented here
        </Typography>
      </Box>
    </Paper>
  );
};

export default TradeForm;
