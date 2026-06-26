import json

def main():
    try:
        with open("_cached_extract.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            
        print(f"Loaded JSON. Keys: {data.keys()}")
        events = data.get("events", [])
        print(f"Total events in cache: {len(events)}")
        
        matches = []
        for e in events:
            cust_id = e.get("customerId", "")
            if cust_id and "371.0.000250" in cust_id:
                matches.append(e)
                
        print(f"Found {len(matches)} matching events for 371.0.000250:")
        for idx, m in enumerate(matches):
            print(f"\nMatch {idx+1}:")
            for k, v in m.items():
                if k in ["contractNo", "customerId", "eventDate", "eventTs", "outletName", "branchName"]:
                    print(f"  {k}: {v}")
    except Exception as ex:
        print("Error:", ex)

if __name__ == "__main__":
    main()
