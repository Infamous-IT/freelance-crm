import { User } from "@prisma/client";

export interface PaginatedUsers {
    data: User[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
};