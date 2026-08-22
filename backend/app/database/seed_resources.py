from backend.app.database.mongodb import resources_collection


resources = [
    {
        "id": "SEC-001",
        "name": "Security Team Alpha",
        "type": "Security",
        "status": "AVAILABLE",
        "location": "Main Security Office",
        "capacity": 5,
    },
    {
        "id": "SEC-002",
        "name": "Security Team Bravo",
        "type": "Security",
        "status": "AVAILABLE",
        "location": "North Gate",
        "capacity": 5,
    },
    {
        "id": "AMB-001",
        "name": "Campus Ambulance 01",
        "type": "Medical",
        "status": "AVAILABLE",
        "location": "Campus Medical Center",
        "capacity": 2,
    },
    {
        "id": "AMB-002",
        "name": "Campus Ambulance 02",
        "type": "Medical",
        "status": "AVAILABLE",
        "location": "Medical Center",
        "capacity": 2,
    },
    {
        "id": "FAU-001",
        "name": "First Aid Unit 01",
        "type": "First Aid",
        "status": "AVAILABLE",
        "location": "Student Activity Center",
        "capacity": 4,
    },
    {
        "id": "FAU-002",
        "name": "First Aid Unit 02",
        "type": "First Aid",
        "status": "AVAILABLE",
        "location": "Engineering Block",
        "capacity": 4,
    },
    {
        "id": "FAC-001",
        "name": "Facilities Response Team Alpha",
        "type": "Facilities",
        "status": "AVAILABLE",
        "location": "Facilities Office",
        "capacity": 6,
    },
    {
        "id": "FAC-002",
        "name": "Facilities Response Team Bravo",
        "type": "Facilities",
        "status": "AVAILABLE",
        "location": "Maintenance Yard",
        "capacity": 6,
    },
    {
        "id": "VEH-001",
        "name": "Campus Emergency Vehicle 01",
        "type": "Transport",
        "status": "AVAILABLE",
        "location": "Transport Hub",
        "capacity": 8,
    },
    {
        "id": "VEH-002",
        "name": "Campus Emergency Vehicle 02",
        "type": "Transport",
        "status": "AVAILABLE",
        "location": "Transport Hub",
        "capacity": 8,
    },
    {
        "id": "COM-001",
        "name": "Emergency Communication Unit 01",
        "type": "Communication",
        "status": "AVAILABLE",
        "location": "Command Center",
        "capacity": 3,
    },
    {
        "id": "COM-002",
        "name": "Emergency Communication Unit 02",
        "type": "Communication",
        "status": "AVAILABLE",
        "location": "Administration Block",
        "capacity": 3,
    },
]


if __name__ == "__main__":

    inserted = 0

    for resource in resources:

        existing = resources_collection.find_one(
            {"id": resource["id"]}
        )

        if existing:
            print(
                f"Already exists: {resource['id']}"
            )
            continue

        resources_collection.insert_one(resource)

        inserted += 1

        print(
            f"Inserted: {resource['id']}"
        )

    print()
    print(
        f"Inserted {inserted} new resources."
    )

    print(
        f"Total resources: "
        f"{resources_collection.count_documents({})}"
    )