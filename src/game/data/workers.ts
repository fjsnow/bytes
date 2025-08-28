export interface Worker {
    id: string;
    name: string;
    cost: (owned: number) => number;
    baseCookiesPerSecond: number;
}

export const WORKER_DATA: Worker[] = [
    {
        id: "intern",
        name: "Intern",
        cost: (owned) => {
            return Math.floor(10 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 1,
    },
    {
        id: "junior_dev",
        name: "Junior Developer",
        cost: (owned) => {
            return Math.floor(1024 ** 1 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 16,
    },
    {
        id: "senior_dev",
        name: "Senior Developer",
        cost: (owned) => {
            return Math.floor(32 * 1024 ** 1 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 256,
    },
    {
        id: "tech_lead",
        name: "Tech Lead",
        cost: (owned) => {
            return Math.floor(1024 ** 2 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 4 * 1024 ** 1,
    },
    {
        id: "engineering_manager",
        name: "Engineering Manager",
        cost: (owned) => {
            return Math.floor(32 * 1024 ** 2 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 64 * 1024 ** 1,
    },
    {
        id: "director",
        name: "Director of Engineering",
        cost: (owned) => {
            return Math.floor(1024 ** 3 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 1024 ** 2,
    },
    {
        id: "vp_engineering",
        name: "VP of Engineering",
        cost: (owned) => {
            return Math.floor(32 * 1024 ** 3 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 16 * 1024 ** 2,
    },
    {
        id: "cto",
        name: "Chief Technology Officer",
        cost: (owned) => {
            return Math.floor(1024 ** 4 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 256 * 1024 ** 2,
    },
    {
        id: "ceo",
        name: "Chief Executive Officer",
        cost: (owned) => {
            return Math.floor(32 * 1024 ** 4 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 4 * 1024 ** 3,
    },
    {
        id: "board_member",
        name: "Board Member",
        cost: (owned) => {
            return Math.floor(1024 ** 5 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 64 * 1024 ** 3,
    },
    {
        id: "chairman",
        name: "Chairman",
        cost: (owned) => {
            return Math.floor(32 * 1024 ** 5 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 1024 ** 4,
    },
    {
        id: "conglomerate_owner",
        name: "Conglomerate Owner",
        cost: (owned) => {
            return Math.floor(1024 ** 6 * Math.pow(1.15, owned));
        },
        baseCookiesPerSecond: 16 * 1024 ** 4,
    },
];

export type WorkerId = (typeof WORKER_DATA)[number]["id"];
