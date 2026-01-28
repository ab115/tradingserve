# Level 1: The Build Pipeline (CI/CD)

> **Job Track**: 🛠️ DevOps Engineer

## Objective
**Automate the deployment of your Trading Bot.**
In this lab, you are a client connecting to the hosted Trading Server. You will write a simple Python script ("The Bot") and use GitHub Actions to test it automatically.

## 🎯 Skills Learned
- `GitHub Actions`
- `YAML Configuration`
- `Python Testing`
- `CI/CD Pipelines`

## The Mission
You are building an Algo Trading firm. You cannot run code manually from your laptop in production. You need a pipeline that verifies your bot's code quality before it touches real money.

## Lab Instructions

### Step 1: Create a Repository
1. Create a new GitHub repository called `algo-bot`.
2. Clone it to your local machine.

### Step 2: Write "The Bot"
Create a file `bot.py`:

```python
import sys

def strategy(price):
    if price < 100:
        return "BUY"
    return "HOLD"

if __name__ == "__main__":
    signal = strategy(99)
    print(f"Signal: {signal}")
```

### Step 3: Define the CI Workflow
Create `.github/workflows/ci.yml`:

```yaml
name: Bot CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    - name: Run Logic Test
      run: |
        python -c "from bot import strategy; assert strategy(99) == 'BUY'"
```

### Step 4: Push & Verify
1. `git add .`, `git commit -m "Init"`, `git push`.
2. Go to your GitHub Repo -> Actions tab.
3. Verify the build turns Green.

## Outcome
You now have a CI pipeline. In future levels, this pipeline could deploy your bot to the cloud.
