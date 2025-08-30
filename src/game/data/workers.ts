import { calculateGeometricBigintCost } from "../../utils/math";

const BASE_WORKER_COST = 16n;
const BASE_WORKER_CPS = 1n;

const WORKER_COST_MULTIPLIER = 16n;
const WORKER_CPS_MULTIPLIER = 8n;

export interface Worker {
    id: string;
    name: string;
    cost: (owned: number) => bigint;
    baseCookiesPerSecond: bigint;
    prerequisitePrestige?: number;
}

const calculateTierValue = (
    baseValue: bigint,
    multiplier: bigint,
    tier: number,
): bigint => {
    return baseValue * multiplier ** BigInt(tier);
};

export const WORKER_DATA: Worker[] = [
    {
        id: "intern",
        name: "Intern",
        cost: (owned) =>
            calculateGeometricBigintCost(BASE_WORKER_COST, 1.15, owned),
        baseCookiesPerSecond: BASE_WORKER_CPS,
        prerequisitePrestige: 0,
    },
    {
        id: "junior_dev",
        name: "Junior Developer",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(BASE_WORKER_COST, WORKER_COST_MULTIPLIER, 1),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            1,
        ),
        prerequisitePrestige: 0,
    },
    {
        id: "senior_dev",
        name: "Senior Developer",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(BASE_WORKER_COST, WORKER_COST_MULTIPLIER, 2),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            2,
        ),
        prerequisitePrestige: 0,
    },
    {
        id: "tech_lead",
        name: "Tech Lead",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(BASE_WORKER_COST, WORKER_COST_MULTIPLIER, 3),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            3,
        ),
        prerequisitePrestige: 0,
    },
    {
        id: "engineering_manager",
        name: "Engineering Manager",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(BASE_WORKER_COST, WORKER_COST_MULTIPLIER, 4),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            4,
        ),
        prerequisitePrestige: 1,
    },
    {
        id: "director",
        name: "Director of Engineering",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(BASE_WORKER_COST, WORKER_COST_MULTIPLIER, 5),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            5,
        ),
        prerequisitePrestige: 1,
    },
    {
        id: "vp_engineering",
        name: "VP of Engineering",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(BASE_WORKER_COST, WORKER_COST_MULTIPLIER, 6),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            6,
        ),
        prerequisitePrestige: 2,
    },
    {
        id: "cto",
        name: "Chief Technology Officer",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(BASE_WORKER_COST, WORKER_COST_MULTIPLIER, 7),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            7,
        ),
        prerequisitePrestige: 2,
    },
    {
        id: "ceo",
        name: "Chief Executive Officer",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(BASE_WORKER_COST, WORKER_COST_MULTIPLIER, 8),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            8,
        ),
        prerequisitePrestige: 3,
    },
    {
        id: "board_member",
        name: "Board Member",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(BASE_WORKER_COST, WORKER_COST_MULTIPLIER, 9),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            9,
        ),
        prerequisitePrestige: 3,
    },
    {
        id: "chairman",
        name: "Chairman",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(
                    BASE_WORKER_COST,
                    WORKER_COST_MULTIPLIER,
                    10,
                ),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            10,
        ),
        prerequisitePrestige: 4,
    },
    {
        id: "conglomerate_owner",
        name: "Conglomerate Owner",
        cost: (owned) =>
            calculateGeometricBigintCost(
                calculateTierValue(
                    BASE_WORKER_COST,
                    WORKER_COST_MULTIPLIER,
                    11,
                ),
                1.15,
                owned,
            ),
        baseCookiesPerSecond: calculateTierValue(
            BASE_WORKER_CPS,
            WORKER_CPS_MULTIPLIER,
            11,
        ),
        prerequisitePrestige: 4,
    },
];

export type WorkerId = (typeof WORKER_DATA)[number]["id"];
export const WORKERS: Record<WorkerId, Worker> = WORKER_DATA.reduce(
    (acc, worker) => {
        acc[worker.id] = worker;
        return acc;
    },
    {} as Record<WorkerId, Worker>,
);
