export interface SeedCategory {
  name: string;
  description: string;
  slaHours?: number;
}

export interface SeedDepartment {
  name: string;
  description: string;
  categories: SeedCategory[];
  manager: {
    name: string;
    email: string;
  };
  technicians: Array<{
    name: string;
    email: string;
  }>;
}

export const departmentData: SeedDepartment[] = [
  {
    name: "Roads & Infrastructure",
    description: "Handles road maintenance, streetlights, and traffic signals.",
    categories: [
      {
        name: "Pothole Repair",
        description: "Damaged or hazardous road potholes",
        slaHours: 72,
      },
      {
        name: "Streetlight Outage",
        description: "Non-functioning streetlights",
        slaHours: 48,
      },
      {
        name: "Traffic Signal Fault",
        description: "Malfunctioning traffic signals or signs",
        slaHours: 24,
      },
    ],
    manager: {
      name: "Sarah Connor (Roads Mgr)",
      email: "manager.roads@citycomplaints.com",
    },
    technicians: [
      { name: "John Tech (Roads)", email: "tech1.roads@citycomplaints.com" },
      { name: "Mike Tech (Roads)", email: "tech2.roads@citycomplaints.com" },
    ],
  },
  {
    name: "Water Supply & Sewage",
    description: "Manages water supply lines, pipe leaks, and drainage issues.",
    categories: [
      {
        name: "Pipe Leakage",
        description: "Main water pipe burst or leaking lines",
        slaHours: 24,
      },
      {
        name: "Low Water Pressure",
        description: "Persistent low pressure issues",
        slaHours: 48,
      },
      {
        name: "Sewage Blockage",
        description: "Blocked sewage or open manholes",
        slaHours: 24,
      },
    ],
    manager: {
      name: "Alex Mercer (Water Mgr)",
      email: "manager.water@citycomplaints.com",
    },
    technicians: [
      { name: "David Tech (Water)", email: "tech1.water@citycomplaints.com" },
      { name: "Emma Tech (Water)", email: "tech2.water@citycomplaints.com" },
    ],
  },
  {
    name: "Sanitation & Waste Management",
    description:
      "Oversees garbage collection, public cleanliness, and illegal dumping.",
    categories: [
      {
        name: "Uncollected Garbage",
        description: "Overdue residential or commercial waste collection",
        slaHours: 48,
      },
      {
        name: "Illegal Dumping",
        description: "Unauthorized dumping of hazardous/bulk waste",
        slaHours: 72,
      },
      {
        name: "Drain Blockage",
        description: "Clogged stormwater drains",
        slaHours: 48,
      },
    ],
    manager: {
      name: "Elena Vance (Sanitation Mgr)",
      email: "manager.sanitation@citycomplaints.com",
    },
    technicians: [
      {
        name: "Carlos Tech (Sanitation)",
        email: "tech1.sanitation@citycomplaints.com",
      },
      {
        name: "Lisa Tech (Sanitation)",
        email: "tech2.sanitation@citycomplaints.com",
      },
    ],
  },
];
