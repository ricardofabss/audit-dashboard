import sys
import pandas as pd

def main():
    try:
        path = r"C:\Users\USER\OneDrive\Desktop\Kaizen\Sample data\Otomotif\Laporan Penjualan Jan25-Jun26.xls"
        
        # Determine engine
        df = None
        for engine in [None, 'xlrd', 'openpyxl', 'pyxlsb']:
            try:
                df = pd.read_excel(path, nrows=5, engine=engine)
                print(f"Success with engine: {engine}")
                break
            except Exception as e:
                print(f"Failed with {engine}: {e}")
        
        if df is None:
            print("Could not read file.")
            return

        print("\nColumns:")
        for col in df.columns:
            print(f"- {col}")
        
        print("\nFirst row:")
        print(df.iloc[0].to_dict())
        
    except Exception as e:
        print("Fatal error:", e)

if __name__ == "__main__":
    main()
