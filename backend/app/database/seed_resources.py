from backend.app.database.mongodb import resources_collection

resources = [
    {
        "id": "SEC-001",
        "name": "Security Team Alpha",
        "type": "Security",
        "status": "AVAILABLE",
        "location": "Main Security Office",
        "capacity": 5,
        "contact_name": "Capt. Rajesh Varma",
        "phone_number": "+91 98480 12345",
        "email": "security.alpha@vignan.ac.in",
        "vehicle_number": "AP-07-SC-1001",
        "designation": "Chief Security Patrol Alpha",
    },
    {
        "id": "SEC-002",
        "name": "Security Team Bravo",
        "type": "Security",
        "status": "AVAILABLE",
        "location": "North Gate",
        "capacity": 5,
        "contact_name": "Sub-Inspector K. Ramesh",
        "phone_number": "+91 98480 12346",
        "email": "security.bravo@vignan.ac.in",
        "vehicle_number": "AP-07-SC-1002",
        "designation": "Perimeter Security In-Charge",
    },
    {
        "id": "AMB-001",
        "name": "Campus Ambulance 01",
        "type": "Medical",
        "status": "AVAILABLE",
        "location": "Campus Medical Center",
        "capacity": 2,
        "contact_name": "S. Venkatesh (Driver)",
        "phone_number": "+91 94401 55501",
        "email": "ambulance01@vignan.ac.in",
        "vehicle_number": "AP-07-EM-0101",
        "designation": "Lead Paramedic & Driver",
    },
    {
        "id": "AMB-002",
        "name": "Campus Ambulance 02",
        "type": "Medical",
        "status": "AVAILABLE",
        "location": "Medical Center",
        "capacity": 2,
        "contact_name": "P. Srinivas (Driver)",
        "phone_number": "+91 94401 55502",
        "email": "ambulance02@vignan.ac.in",
        "vehicle_number": "AP-07-EM-0102",
        "designation": "Emergency Ambulance Driver",
    },
    {
        "id": "FAU-001",
        "name": "First Aid Unit 01",
        "type": "First Aid",
        "status": "AVAILABLE",
        "location": "Student Activity Center",
        "capacity": 4,
        "contact_name": "Dr. Anitha Reddy",
        "phone_number": "+91 94402 66601",
        "email": "firstaid.sac@vignan.ac.in",
        "vehicle_number": "N/A - Mobile Kit",
        "designation": "Emergency Medical Officer",
    },
    {
        "id": "FAU-002",
        "name": "First Aid Unit 02",
        "type": "First Aid",
        "status": "AVAILABLE",
        "location": "Engineering Block",
        "capacity": 4,
        "contact_name": "Nurse B. Lakshmi",
        "phone_number": "+91 94402 66602",
        "email": "firstaid.eng@vignan.ac.in",
        "vehicle_number": "N/A - Mobile Kit",
        "designation": "Staff Nurse & First Responder",
    },
    {
        "id": "FAC-001",
        "name": "Facilities Response Team Alpha",
        "type": "Facilities",
        "status": "AVAILABLE",
        "location": "Facilities Office",
        "capacity": 6,
        "contact_name": "Er. Ch. Nageswara Rao",
        "phone_number": "+91 98660 77701",
        "email": "facilities.alpha@vignan.ac.in",
        "vehicle_number": "AP-07-FC-2001",
        "designation": "Facilities Safety Officer",
    },
    {
        "id": "FAC-002",
        "name": "Facilities Response Team Bravo",
        "type": "Facilities",
        "status": "AVAILABLE",
        "location": "Maintenance Yard",
        "capacity": 6,
        "contact_name": "G. Mallikarjun",
        "phone_number": "+91 98660 77702",
        "email": "facilities.bravo@vignan.ac.in",
        "vehicle_number": "AP-07-FC-2002",
        "designation": "Fire & Electrical Supervisor",
    },
    {
        "id": "VEH-001",
        "name": "Campus Emergency Vehicle 01",
        "type": "Transport",
        "status": "AVAILABLE",
        "location": "Transport Hub",
        "capacity": 8,
        "contact_name": "T. Appa Rao (Driver)",
        "phone_number": "+91 99890 88801",
        "email": "transport01@vignan.ac.in",
        "vehicle_number": "AP-07-TR-3001",
        "designation": "Emergency Transport Driver",
    },
    {
        "id": "VEH-002",
        "name": "Campus Emergency Vehicle 02",
        "type": "Transport",
        "status": "AVAILABLE",
        "location": "Transport Hub",
        "capacity": 8,
        "contact_name": "K. Govind (Driver)",
        "phone_number": "+91 99890 88802",
        "email": "transport02@vignan.ac.in",
        "vehicle_number": "AP-07-TR-3002",
        "designation": "Emergency Evacuation Shuttle Driver",
    },
    {
        "id": "COM-001",
        "name": "Emergency Communication Unit 01",
        "type": "Communication",
        "status": "AVAILABLE",
        "location": "Command Center",
        "capacity": 3,
        "contact_name": "M. Satyanarayana",
        "phone_number": "+91 98499 99901",
        "email": "broadcast.cc@vignan.ac.in",
        "vehicle_number": "N/A - Control Desk",
        "designation": "Emergency Communications Lead",
    },
    {
        "id": "COM-002",
        "name": "Emergency Communication Unit 02",
        "type": "Communication",
        "status": "AVAILABLE",
        "location": "Administration Block",
        "capacity": 3,
        "contact_name": "D. Madhuri",
        "phone_number": "+91 98499 99902",
        "email": "broadcast.admin@vignan.ac.in",
        "vehicle_number": "N/A - Control Desk",
        "designation": "Radio Dispatch Coordinator",
    },
]


def seed():
    inserted = 0
    updated = 0

    for resource in resources:
        existing = resources_collection.find_one({"id": resource["id"]})
        if existing:
            # Update with contact metadata while keeping current status if already initialized
            resources_collection.update_one(
                {"id": resource["id"]},
                {
                    "$set": {
                        "name": resource["name"],
                        "type": resource["type"],
                        "location": resource["location"],
                        "capacity": resource["capacity"],
                        "contact_name": resource["contact_name"],
                        "phone_number": resource["phone_number"],
                        "email": resource["email"],
                        "vehicle_number": resource["vehicle_number"],
                        "designation": resource["designation"],
                    }
                },
            )
            updated += 1
        else:
            resources_collection.insert_one(resource)
            inserted += 1

    print(f"Resources seeded: {inserted} inserted, {updated} updated.")
    print(f"Total resources: {resources_collection.count_documents({})}")


if __name__ == "__main__":
    seed()