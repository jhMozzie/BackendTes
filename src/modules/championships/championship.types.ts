export interface CreateChampionshipPayload {
    name: string;
    startDate: string;
    location: string;
}

export interface UpdateChampionshipPayload {
    name?: string;
    startDate?: string;
    location?: string;
}
    