import React, { useEffect } from "react";
import { Snackbar, Alert } from "@mui/material";
import useAppStore from "../stores/app";

const NotificationSystem = () => {
  const { notifications, removeNotification } = useAppStore();

  // 处理关闭通知
  const handleClose = (id) => {
    removeNotification(id);
  };

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration || 5000}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.type || "info"}
            sx={{ width: "100%" }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default NotificationSystem;
