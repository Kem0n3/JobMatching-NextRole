import React from 'react';
import JobCard from './JobCard';

const JobList = ({ jobs }) => {
  if (!jobs || jobs.length === 0) {
    return <p className="text-center text-gray-500">No job listings found.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {jobs.map(job => (
        <JobCard key={job._id} job={job} />
      ))}
    </div>
  );
};

export default JobList;
