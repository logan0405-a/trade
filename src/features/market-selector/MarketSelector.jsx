import React from "react";
import {
  Paper,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import useMarketStore from "../../stores/marketStore";

const MarketSelector = () => {
  const { marketDetails, currentMarket, setCurrentMarket, connectionStatus } =
    useMarketStore();

  const handleChange = (event) => {
    const newMarket = event.target.value;
    setCurrentMarket(newMarket);
  };

  // 找到当前交易对的详细信息
  const currentPairDetails =
    marketDetails.find((pair) => pair.symbol === currentMarket) ||
    marketDetails[0];

  // 检查连接状态
  const isLoading = Object.values(connectionStatus).some(
    (status) => status === "connecting",
  );

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6">Market Selector</Typography>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="pair-select-label">Trading Pair</InputLabel>
          <Select
            labelId="pair-select-label"
            id="pair-select"
            value={currentMarket}
            label="Trading Pair"
            onChange={handleChange}
            disabled={isLoading}
          >
            {marketDetails.map((pair) => (
              <MenuItem key={pair.symbol} value={pair.symbol}>
                {pair.baseAsset}/{pair.quoteAsset}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Paper>
  );
};

export default MarketSelector;
