import { create } from "zustand";

type ModalParams = Record<string, any>;

type MainModalType = {
  show: boolean;
  modalName: string;
  modalParams: ModalParams;
  modalOpen: (name: string, params?: ModalParams) => void;
  modalClose: () => void;
};

export const useMainModal = create<MainModalType>((set) => ({
  show: false,
  modalName: "",
  modalParams: {},
  modalOpen: (name, params = {}) => set({ show: true, modalName: name, modalParams: params }),
  modalClose: () => set({ show: false, modalName: "", modalParams: {} }),
}));
