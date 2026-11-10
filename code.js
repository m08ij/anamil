// مقاطع كود قصيرة للتدريب على الرموز والأقواس
window.CODE_SNIPPETS = {
js: [
`function greet(name) {
  return "Hello, " + name + "!";
}`,
`const nums = [3, 7, 1, 9];
const max = Math.max(...nums);
console.log(max);`,
`for (let i = 0; i < 5; i++) {
  console.log(i * 2);
}`,
`const user = { name: "Sara", age: 21 };
const { name, age } = user;`,
`const double = (x) => x * 2;
const list = [1, 2, 3].map(double);`,
`if (score >= 90) {
  grade = "A";
} else {
  grade = "B";
}`,
`async function load(url) {
  const res = await fetch(url);
  return res.json();
}`,
`const total = items.reduce((sum, item) => {
  return sum + item.price;
}, 0);`,
`let count = 0;
button.addEventListener("click", () => {
  count++;
});`,
`const isEven = (n) => n % 2 === 0;
const evens = [1, 2, 3, 4].filter(isEven);`,
`class Timer {
  constructor(seconds) {
    this.seconds = seconds;
  }
}`,
`const words = text.split(" ");
const longest = words.sort((a, b) => b.length - a.length)[0];`,
`try {
  const data = JSON.parse(input);
} catch (err) {
  console.error(err.message);
}`,
`const key = "theme";
localStorage.setItem(key, "dark");`
],
py: [
`def greet(name):
    return f"Hello, {name}!"`,
`nums = [3, 7, 1, 9]
print(max(nums))`,
`for i in range(5):
    print(i * 2)`,
`user = {"name": "Sara", "age": 21}
print(user["name"])`,
`squares = [x ** 2 for x in range(10)]`,
`if score >= 90:
    grade = "A"
else:
    grade = "B"`,
`def is_even(n):
    return n % 2 == 0`,
`with open("notes.txt") as f:
    lines = f.readlines()`,
`class Timer:
    def __init__(self, seconds):
        self.seconds = seconds`,
`total = sum(item["price"] for item in cart)`,
`words = text.split()
longest = max(words, key=len)`,
`try:
    value = int(answer)
except ValueError:
    print("Not a number")`,
`while count < 10:
    count += 1`,
`import random
choice = random.choice(["a", "b", "c"])`
]
};
