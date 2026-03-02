list1 = [
    {"name": "Aditya", "age": 20, "grade": 90},
    {"name": "Rohan", "age": 21, "grade": 96},
    {"name": "Chris", "age": 19, "grade": 98},
    {"name": "Daren", "age": 22, "grade": 92}
]
filtered_list = filter(lambda x: x["grade"] > 95, list1)    



print(list(filtered_list))