// Footer.jsx - 更精简的页脚
import React from "react";
import { Box, Typography, Link } from "@mui/material";

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 1.5,
        px: 2,
        borderTop: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Typography variant="body2" color="text.secondary" align="center">
        © Crypto Trading Platform {new Date().getFullYear()}. Demo Application
      </Typography>
    </Box>
  );
};

export default Footer;
