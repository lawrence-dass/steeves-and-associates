"""
Database seeder — loads operational data from Excel and competitor data from CSV.
Run: python database/seed.py
"""
import os
import csv
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/steeves_capstone")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_EXCEL_PATH = os.path.join(SCRIPT_DIR, "Steeves_and_Associates_2020_2025.xlsx")
DEFAULT_CSV_PATH = os.path.join(SCRIPT_DIR, "..", "backend", "data", "microsoft-azure-partners-canada__new_1.csv")

def parse_date(date_str):
    """Parse date from DD.MM.YYYY format."""
    try:
        return datetime.strptime(date_str, "%d.%m.%Y").date()
    except ValueError:
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return None

def seed_time_entries(cursor, filepath):
    """Load operational data from Excel using openpyxl."""
    import openpyxl
    wb = openpyxl.load_workbook(filepath, read_only=True)
    ws = wb.active
    
    rows_data = []
    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
        if row[0] is None:
            continue
        # Support files with extra trailing columns; we only load the first 8 fields.
        first_eight = list(row[:8])
        if len(first_eight) < 8:
            first_eight.extend([None] * (8 - len(first_eight)))
        customer, project, worked_date, task, resource, hours, rate, price = first_eight
        
        if isinstance(worked_date, str):
            worked_date = parse_date(worked_date)
        elif hasattr(worked_date, 'date'):
            worked_date = worked_date.date()
        
        rows_data.append((
            str(customer).strip(),
            str(project).strip(),
            worked_date,
            str(task).strip() if task else None,
            str(resource).strip(),
            float(hours) if hours else 0,
            float(rate) if rate else 0,
            float(price) if price else 0,
        ))

    if not rows_data:
        print("  WARNING: No valid time entry rows found in Excel file.")
        return
    
    execute_values(cursor, """
        INSERT INTO time_entries 
        (customer_name, project, worked_date, task_or_ticket_title, resource_name, 
         billable_hours, hourly_billing_rate, extended_price)
        VALUES %s
    """, rows_data)
    
    print(f"  Loaded {len(rows_data)} time entries")

def seed_competitors(cursor, filepath):
    """Load competitor data from CSV."""
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows_data = []
        for row in reader:
            rows_data.append((
                row['Company Name'].strip(),
                row['Hourly Rate'].strip(),
                row['Number of Employees'].strip(),
                row['Founding Year'].strip(),
                row['Location'].strip(),
                row['Cloud Computing Focus Area Percentage'].strip(),
                row['Brief Description'].strip(),
                row.get('Microsoft/Azure Indication', 'Yes').strip().lower() == 'yes',
                row['Last Year Revenue'].strip(),
                row['Website'].strip(),
                row.get('Microsoft Gold Certified Partner', 'No').strip().lower() == 'yes',
                row.get('Microsoft FastTrack Partner', 'No').strip().lower() == 'yes',
                row.get('Elite Enterprise Mobility + Security & Windows 10 Premier Partner', 'No').strip().lower() == 'yes',
                row.get('Azure Circle Partner', 'No').strip().lower() == 'yes',
                row.get('Leading System Centre Partner', 'No').strip().lower() == 'yes',
            ))
    
    execute_values(cursor, """
        INSERT INTO competitors 
        (company_name, hourly_rate, num_employees, founding_year, location, 
         cloud_focus_pct, description, microsoft_indication, last_year_revenue, website,
         gold_certified, fasttrack_partner, elite_ems_partner, azure_circle_partner, 
         leading_system_centre)
        VALUES %s
    """, rows_data)
    
    print(f"  Loaded {len(rows_data)} competitors")

def add_steeves_as_competitor(cursor):
    """Add Steeves and Associates to the competitor table for comparison."""
    cursor.execute("""
        INSERT INTO competitors 
        (company_name, hourly_rate, num_employees, founding_year, location, 
         cloud_focus_pct, description, microsoft_indication, last_year_revenue, website,
         gold_certified, fasttrack_partner, elite_ems_partner, azure_circle_partner, 
         leading_system_centre)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        'Steeves and Associates', '$150-225/hr', '21', '1992', 'Burnaby',
        '85%', 
        '1st Microsoft Cloud Partner in Canada. Inaugural 100 Microsoft FastTrack Partner. '
        'Elite Enterprise Mobility + Security & Windows 10 Premier Partner. '
        'Senior enterprise consultants averaging 25 years experience.',
        True, 'NA', 'https://www.steeves.net',
        True, True, True, True, True
    ))
    print("  Added Steeves and Associates to competitors table")

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Clear existing data
    cursor.execute("TRUNCATE time_entries, competitors, chat_history RESTART IDENTITY CASCADE")
    
    print("Seeding database...")
    
    # Seed operational data
    excel_path = os.getenv("EXCEL_PATH", DEFAULT_EXCEL_PATH)
    if os.path.exists(excel_path):
        print(f"Loading time entries from {excel_path}...")
        seed_time_entries(cursor, excel_path)
    else:
        print(f"  WARNING: {excel_path} not found. Skipping time entries.")
    
    # Seed competitor data
    csv_path = os.getenv("CSV_PATH", DEFAULT_CSV_PATH)
    if os.path.exists(csv_path):
        print(f"Loading competitors from {csv_path}...")
        seed_competitors(cursor, csv_path)
        add_steeves_as_competitor(cursor)
    else:
        print(f"  WARNING: {csv_path} not found. Skipping competitors.")
    
    conn.commit()
    cursor.close()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    main()
