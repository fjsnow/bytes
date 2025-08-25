export interface Worker {
    id: string;
    name: string;
    baseCost: number;
    baseCookiesPerSecond: number;
}

export const WORKER_DATA: Worker[] = [
    {
        id: "intern",
        name: "Intern",
        baseCost: 10,
        baseCookiesPerSecond: 1,
    },
    {
        id: "junior_dev",
        name: "Junior Developer",
        baseCost: 1024 ** 1,
        baseCookiesPerSecond: 16,
    },
    {
        id: "senior_dev",
        name: "Senior Developer",
        baseCost: 32 * 1024 ** 1,
        baseCookiesPerSecond: 256,
    },
    {
        id: "tech_lead",
        name: "Tech Lead",
        baseCost: 1024 ** 2,
        baseCookiesPerSecond: 4 * 1024 ** 1,
    },
    {
        id: "engineering_manager",
        name: "Engineering Manager",
        baseCost: 32 * 1024 ** 2,
        baseCookiesPerSecond: 64 * 1024 ** 1,
    },
    {
        id: "director",
        name: "Director of Engineering",
        baseCost: 1024 ** 3,
        baseCookiesPerSecond: 1024 ** 2,
    },
    {
        id: "vp_engineering",
        name: "VP of Engineering",
        baseCost: 32 * 1024 ** 3,
        baseCookiesPerSecond: 16 * 1024 ** 2,
    },
    {
        id: "cto",
        name: "Chief Technology Officer",
        baseCost: 1024 ** 4,
        baseCookiesPerSecond: 256 * 1024 ** 2,
    },
    {
        id: "ceo",
        name: "Chief Executive Officer",
        baseCost: 32 * 1024 ** 4,
        baseCookiesPerSecond: 4 * 1024 ** 3,
    },
    {
        id: "board_member",
        name: "Board Member",
        baseCost: 1024 ** 5,
        baseCookiesPerSecond: 64 * 1024 ** 3,
    },
    {
        id: "chairman",
        name: "Chairman",
        baseCost: 32 * 1024 ** 5,
        baseCookiesPerSecond: 1024 ** 4,
    },
    {
        id: "conglomerate_owner",
        name: "Conglomerate Owner",
        baseCost: 1024 ** 6,
        baseCookiesPerSecond: 16 * 1024 ** 4,
    },
];

export type WorkerId = (typeof WORKER_DATA)[number]["id"];
