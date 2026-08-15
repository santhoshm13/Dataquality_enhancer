import os

file_to_remove = os.path.join("data", "input", "Unilog_200_Items_Input.csv")
if os.path.exists(file_to_remove):
    os.remove(file_to_remove)
    print(f"Removed misleading file: {file_to_remove}")
else:
    print(f"File {file_to_remove} does not exist.")
