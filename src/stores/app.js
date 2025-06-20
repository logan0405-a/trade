import { create } from "zustand";

// 应用全局状态
const useAppStore = create((set) => ({
  isLoading: false,
  error: null,
  notifications: [],

  // 设置加载状态
  setLoading: (isLoading) => set({ isLoading }),

  // 设置错误
  setError: (error) => set({ error }),

  // 添加通知
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: Date.now(), ...notification },
      ],
    })),

  // 删除通知
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

export default useAppStore;
