import csv
import random
import os
import sys

NUM_ROWS = 50

COLUMNS = ["CITY", "POPULATION_MLN", "AREA_KM2", "CONTINENT"]

def generate_row():
    return {
        "CITY": random.randint(100000, 20000000),
        "POPULATION_MLN": round(random.uniform(0.1, 20.0), 2),
        "AREA_KM2": random.randint(50, 5000),
        "CONTINENT": random.choice(["Europe", "Asia", "Africa", "Americas", "Oceania"]),
    }

OUTPUT_DIR = sys.argv[1] if len(sys.argv) > 1 else "/data"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "data.csv")

os.makedirs(OUTPUT_DIR, exist_ok=True)

rows = [generate_row() for _ in range(NUM_ROWS)]

with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=COLUMNS)
    writer.writeheader()
    writer.writerows(rows)
