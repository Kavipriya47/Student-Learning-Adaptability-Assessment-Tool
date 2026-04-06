import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const AdminActionTile = ({ title, desc, icon: Icon, color, path }) => (
    <Link to={path} className="group relative">
        <div className={`glass-card h-full flex flex-col items-start hover:border-${color}/50`}>
            <div className={`p-4 bg-${color}/10 rounded-2xl text-${color} group-hover:scale-110 transition-transform mb-6 ring-1 ring-${color}/20`}>
                <Icon size={28} />
            </div>
            <h3 className="text-xl font-bold font-outfit text-white mb-2">{title}</h3>
            <p className="text-sm text-text-dim mb-8">{desc}</p>
            <div className="mt-auto flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
                Manage Module <ArrowRight size={14} />
            </div>
        </div>
    </Link>
);

export default AdminActionTile;
