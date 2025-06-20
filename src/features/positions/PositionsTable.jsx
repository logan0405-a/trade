// PositionsTable.jsx
import React from "react";
import { Paper, Typography, Box } from "@mui/material";

const PositionsTable = () => {
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
        <Typography variant="h6">Positions & PnL</Typography>
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
          Open positions and profit/loss will be displayed here
        </Typography>
      </Box>
    </Paper>
  );
};

export default PositionsTable;
