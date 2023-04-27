export interface ActivityPayload {
    details?: string | undefined;
    state?: string | undefined;
    startTimestamp?: number | null | undefined;
    largeImageKey?: string | undefined;
    largeImageText?: string | undefined;
    smallImageKey?: string | undefined;
    smallImageText?: string | undefined;
    partyId?: string | undefined;
    partySize?: number | undefined;
    partyMax?: number | undefined;
    matchSecret?: string | undefined;
    joinSecret?: string | undefined;
    spectateSecret?: string | undefined;
    buttons?: { label: string; url: string }[] | undefined;
    instance?: boolean | undefined;
}
