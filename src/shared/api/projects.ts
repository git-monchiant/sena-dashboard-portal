import { Project } from '@shared/types';

// Mock data - replace with actual API calls
export const mockProjects: Project[] = [
  { id: 1, name: 'SENA Park Grand Rama 9' },
  { id: 2, name: 'SENA Ville Bangna' },
  { id: 3, name: 'SENA Ecotown Chiang Mai' },
  { id: 4, name: 'SENA Park Pinklao' },
  { id: 5, name: 'SENA Grand Sukhumvit' },
];

export async function getProjects(): Promise<Project[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return mockProjects;
}

export async function getProjectById(id: number): Promise<Project | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return mockProjects.find((p) => p.id === id);
}
