const { readFileSync } = require('fs');
const { assert } = require('console');

// check for optional command line argument
let defaultInputType = 'input';
let inputType = defaultInputType;
if (process.argv.length > 2) {
  inputType = process.argv[2].replace(/\..{3}$/, '');
}

let DEBUG = false;
if (/sample.*/.test(inputType) || process.argv.length > 3) {
  DEBUG = true;
}

let [workflows, ratings] = readFileSync(`${__dirname}/${inputType}.txt`, 'utf8')
  .split(/\r?\n\r?\n/)
  .map(lines => lines.split(/\r?\n/));

function initWorkflowDetails(workflows) {
  const workflowDetails = {};

  workflows.forEach(workflow => {
    let [name, rules] = workflow.split(/[{}]/g);
    workflowDetails[name] = rules.split(',');
  });

  return workflowDetails;
}

function isAcceptedByWorkflows(workflowDetails, x, m, a, s) {
  let workflowName = 'in';
  let workflowRules = workflowDetails[workflowName].slice(0);
  while (!/^[AR]$/.test(workflowRules[0])) {
    const rule = workflowRules.shift();
    if (rule.includes(':')) {
      const [comparison, nextWorkflowName] = rule.split(':');
      if (eval(comparison)) {
        if (nextWorkflowName === 'A') {
          return true;
        } else if (nextWorkflowName === 'R') {
          return false;
        } else {
          workflowName = nextWorkflowName;
          workflowRules = workflowDetails[workflowName].slice(0);
        }
      }
    } else {
      workflowName = rule;
      workflowRules = workflowDetails[workflowName].slice(0);
    }
  }

  return workflowRules[0] === 'A';
}

function findAcceptedRangeCombinations(workflowDetails) {
  function processWorkflow(workflowName, ranges) {
    if (workflowName === 'R') return 0;
    if (workflowName === 'A') {
      return Object.values(ranges).reduce((product, range) => 
        product * (range[1] - range[0] + 1), 1);
    }

    let total = 0;
    let currentRanges = { ...ranges };
    
    for (const rule of workflowDetails[workflowName]) {
      if (!rule.includes(':')) {
        total += processWorkflow(rule, currentRanges);
        continue;
      }

      const [condition, nextWorkflow] = rule.split(':');
      const category = condition[0];
      const operator = condition[1];
      const value = parseInt(condition.slice(2));
      
      const [min, max] = currentRanges[category];
      let matchedRanges = { ...currentRanges };
      
      if (operator === '<') {
        matchedRanges[category] = [min, Math.min(value - 1, max)];
        currentRanges[category] = [Math.max(value, min), max];
      } else {
        matchedRanges[category] = [Math.max(value + 1, min), max];
        currentRanges[category] = [min, Math.min(value, max)];
      }
      
      if (matchedRanges[category][0] <= matchedRanges[category][1]) {
        total += processWorkflow(nextWorkflow, matchedRanges);
      }
    }
    
    return total;
  }

  const initialRanges = {
    x: [1, 4000],
    m: [1, 4000],
    a: [1, 4000],
    s: [1, 4000]
  };

  return processWorkflow('in', initialRanges);
}

const workflowDetails = initWorkflowDetails(workflows);
const ratingNumbers = ratings.map(rating => {
  const categories = rating.split(/[}{,}]/).slice(1, -1);
  categories.forEach((category) => {
    eval(category);
  });

  return isAcceptedByWorkflows(workflowDetails, x, m, a, s) ? x + m + a + s : 0;
});

const part1 = ratingNumbers.reduce((sum, rating) => sum + rating, 0);
const part2 = findAcceptedRangeCombinations(workflowDetails);

const answers = {
  part1: {
    actual: part1,
    expected: {
      sample: 19114,
      input: 432434
    }
  },
  part2: {
    actual: part2,
    expected: {
      sample: 167409079868000,
      input: 132557544578569
    }
  }
};

let expectedPart1 = answers.part1.expected[inputType];
let expectedPart2 = answers.part2.expected[inputType];
console.log(`Answer for part 1: ${answers.part1.actual}`);
if (expectedPart1 !== null) {
  console.log(`        should be: ${expectedPart1}`);
  assert(answers.part1.actual === expectedPart1);
}

if (answers.part2.actual !== null) {
  console.log(`Answer for part 2: ${answers.part2.actual}`);
  if (expectedPart2 !== null) {
    console.log(`        should be: ${expectedPart2}`);
    assert(answers.part2.actual === expectedPart2);
  }
}
