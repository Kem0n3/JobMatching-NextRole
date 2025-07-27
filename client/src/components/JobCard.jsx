import React from 'react';

const JobCard = ({ job }) => {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300 ease-in-out">
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-800">{job.jobTitle}</h3>
        <p className="text-md text-gray-600 mt-1">{job.recruiter_id.companyName}</p>
        <p className="text-sm text-gray-500 mt-2">{job.jobLocation}</p>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
            {job.jobType}
          </span>
          <span className="bg-green-100 text-green-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
            {job.careerLevel}
          </span>
        </div>
        
        <div className="mt-4">
          <h4 className="font-semibold text-gray-700">Skills:</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {job.requiredSkills.slice(0, 5).map(skill => (
              <span key={skill} className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Posted: {new Date(job.postedDate).toLocaleDateString()}
          </span>
          <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-300">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
