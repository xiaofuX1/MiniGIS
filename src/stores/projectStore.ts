import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface Project {
  id: string;
  name: string;
  path?: string;
  layers: any[];
  mapConfig: {
    center: [number, number];
    zoom: number;
    projection: string;
    basemapUrl: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProjectStore {
  currentProject: Project | null;
  recentProjects: Project[];
  createNewProject: (name: string) => Promise<void>;
  openProject: (path: string) => Promise<void>;
  saveProject: (path?: string) => Promise<void>;
  closeProject: () => void;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentProject: null,
  recentProjects: [],

  createNewProject: async (name: string) => {
    try {
      const project = await invoke<Project>('new_project', { name });
      set({ currentProject: project });
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },

  openProject: async (path: string) => {
    try {
      const project = await invoke<Project>('open_project', { path });
      set((state) => ({
        currentProject: project,
        recentProjects: [
          project,
          ...state.recentProjects.filter((p) => p.path !== path),
        ].slice(0, 10),
      }));
    } catch (error) {
      console.error('Failed to open project:', error);
      throw error;
    }
  },

  saveProject: async (path?: string) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No project to save');
    }

    try {
      const savedPath = await invoke<string>('save_project', {
        project: currentProject,
        path,
      });
      
      set((state) => ({
        currentProject: {
          ...state.currentProject!,
          path: savedPath,
          updatedAt: new Date().toISOString(),
        },
      }));
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  },

  closeProject: () => {
    set({ currentProject: null });
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },
}));
