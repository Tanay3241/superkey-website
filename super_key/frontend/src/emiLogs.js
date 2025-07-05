function convertTimestamp(timestamp) {
  if (!timestamp || !timestamp._seconds) return '';
  const date = new Date(timestamp._seconds * 1000); // milliseconds
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

const emiLogs = [
  {
    "id": "7myTt03qAXwysS3c8uzr",
    "paidAt": {
      "_seconds": 1751282529,
      "_nanoseconds": 444000000
    },
    "amount": 2500,
    "method": "UPI",
    "status": "onTime",
    "createdBy": "kuqvt7UgweYNUNtXOQFeGgSLwXl2"
  },
  {
    "id": "qzxJx2aPJQjl5zoRXij9",
    "paidAt": {
      "_seconds": 1751282044,
      "_nanoseconds": 159000000
    },
    "amount": 2500,
    "method": "UPI",
    "status": "onTime",
    "createdBy": "kuqvt7UgweYNUNtXOQFeGgSLwXl2"
  }
]
// Example usage:
const logs = emiLogs.map(log => ({
  ...log,
  formattedDate: convertTimestamp(log.paidAt)
}));

console.log(logs);