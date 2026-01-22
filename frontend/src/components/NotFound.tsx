import Lottie from 'lottie-react';
import React from 'react';
import { useNavigate } from 'react-router';
import robot404 from '../assets/404_robot.json';

const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 p-6 text-center relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FA8112]/10 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#F5E7C6]/10 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 w-full max-w-[500px] mb-8">
                <Lottie animationData={robot404} loop={true} />
            </div>

        </div>
    );
};

export default NotFound;
