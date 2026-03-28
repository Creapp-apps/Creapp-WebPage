import { supabase } from './supabaseClient';

export interface Project {
    id: string;
    name: string;
    client: string;
    description?: string;
    status: 'active' | 'development' | 'paused' | 'delivered';
    production_url?: string;
    github_url?: string;
    admin_url?: string;
    admin_email?: string;
    admin_password?: string;
    stack?: string[];
    vercel_url?: string;
    notes?: string;
    color: string;
    created_at: string;
    updated_at: string;
}

export type ProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at'>;

export async function getAllProjects(): Promise<Project[]> {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function createProject(input: ProjectInput): Promise<Project> {
    const { data, error } = await supabase
        .from('projects')
        .insert([input])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateProject(id: string, input: Partial<ProjectInput>): Promise<Project> {
    const { data, error } = await supabase
        .from('projects')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteProject(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
}
