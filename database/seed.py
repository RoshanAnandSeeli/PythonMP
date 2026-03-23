from database.models import db, CPUProfile

CPU_PROFILES = [
    {
        "name": "Intel Core i5-12400",
        "cores": 6,
        "tdp": 65.0,
        "max_temp": 100.0,
        "core_layout": [[0.3, 0.25], [0.3, 0.5], [0.3, 0.75],
                        [0.7, 0.25], [0.7, 0.5], [0.7, 0.75]]
    },
    {
        "name": "Intel Core i7-13700K",
        "cores": 8,
        "tdp": 125.0,
        "max_temp": 100.0,
        "core_layout": [[0.25, 0.2], [0.25, 0.45], [0.25, 0.6], [0.25, 0.8],
                        [0.75, 0.2], [0.75, 0.45], [0.75, 0.6], [0.75, 0.8]]
    },
    {
        "name": "AMD Ryzen 5 5600X",
        "cores": 6,
        "tdp": 65.0,
        "max_temp": 95.0,
        "core_layout": [[0.35, 0.2], [0.35, 0.5], [0.35, 0.8],
                        [0.65, 0.2], [0.65, 0.5], [0.65, 0.8]]
    },
    {
        "name": "AMD Ryzen 9 7950X",
        "cores": 16,
        "tdp": 170.0,
        "max_temp": 95.0,
        "core_layout": [
            [0.15, 0.15], [0.15, 0.35], [0.15, 0.55], [0.15, 0.75],
            [0.35, 0.15], [0.35, 0.35], [0.35, 0.55], [0.35, 0.75],
            [0.55, 0.15], [0.55, 0.35], [0.55, 0.55], [0.55, 0.75],
            [0.75, 0.15], [0.75, 0.35], [0.75, 0.55], [0.75, 0.75]
        ]
    },
    {
        "name": "Apple M2",
        "cores": 8,
        "tdp": 20.0,
        "max_temp": 90.0,
        "core_layout": [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75],
                        [0.5,  0.25], [0.5,  0.75],
                        [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]]
    }
]

def seed_cpu_profiles():
    if CPUProfile.query.count() == 0:
        for p in CPU_PROFILES:
            db.session.add(CPUProfile(**p))
        db.session.commit()
        print("CPU profiles seeded.")
    else:
        print("Profiles already exist, skipping seed.")
