import { useState, useEffect } from 'react';
import JobList from '../components/JobList';

function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // The Vite proxy will forward this request to http://localhost:3000/api/jobs
        const res = await fetch('/api/jobs');
        if (!res.ok) {
          throw new Error(`Network response was not ok (status: ${res.status})`);
        }
        const data = await res.json();
        setJobs(data);
      } catch (error) {
        console.error("Fetch error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Job Listings</h1>
      
      {loading && (
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading jobs...</p>
        </div>
      )}
      
      {error && (
        <div className="text-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {!loading && !error && (
        <JobList jobs={jobs} />
      )}
    </div>
  );
}

export default JobsPage;
