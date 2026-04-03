import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { StarRating } from './StarRating';
import { BadgeCheck, Briefcase, Home, TrendingUp } from 'lucide-react';
import type { AgentSearchResult } from '../types';

interface Props {
  agent: AgentSearchResult;
}

export function AgentSearchCard({ agent }: Props) {
  return (
    <Link
      to={`/agent/${agent.agent_id}`}
      className="block bg-card rounded-xl border border-border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      {/* Top: avatar + agency */}
      <div className="flex items-start gap-3.5">
        <div className="relative">
          <Avatar className="w-[72px] h-[72px] border-2 border-border">
            <AvatarImage src={agent.avatar_url || ''} alt={agent.display_name || 'Agent'} className="object-cover" />
            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
              {(agent.display_name || 'A')[0]}
            </AvatarFallback>
          </Avatar>
          {agent.agency_logo && (
            <img
              src={agent.agency_logo}
              alt=""
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border border-border object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {agent.display_name || 'Agent'}
            </h3>
            <BadgeCheck size={14} className="text-primary shrink-0" />
          </div>
          {agent.headline && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{agent.headline}</p>
          )}
          {agent.avg_rating != null && agent.avg_rating > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <StarRating rating={agent.avg_rating} size="sm" />
              <span className="text-xs text-muted-foreground">({agent.review_count})</span>
            </div>
          )}
        </div>
      </div>

      {/* Specialties */}
      {agent.specialties && agent.specialties.filter(Boolean).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {agent.specialties.filter(Boolean).slice(0, 2).map(s => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium">
              {s.trim()}
            </span>
          ))}
          {agent.specialties.filter(Boolean).length > 2 && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
              +{agent.specialties.filter(Boolean).length - 2}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        {agent.sold_count > 0 && (
          <span className="flex items-center gap-1"><TrendingUp size={12} /> {agent.sold_count} sold</span>
        )}
        {agent.active_listings > 0 && (
          <span className="flex items-center gap-1"><Home size={12} /> {agent.active_listings} active</span>
        )}
        {agent.years_experience && agent.years_experience > 0 && (
          <span className="flex items-center gap-1"><Briefcase size={12} /> {agent.years_experience} yrs</span>
        )}
      </div>

      {/* Service suburbs */}
      {agent.service_suburbs && agent.service_suburbs.length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-2 truncate">
          {agent.service_suburbs.slice(0, 3).join(', ')}
          {agent.service_suburbs.length > 3 && ` +${agent.service_suburbs.length - 3}`}
        </p>
      )}

      {/* Agency */}
      {agent.agency_name && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
          {agent.agency_logo && <img src={agent.agency_logo} alt="" className="w-4 h-4 rounded object-cover" />}
          <span className="text-xs text-muted-foreground">{agent.agency_name}</span>
        </div>
      )}

      {/* CTA */}
      <button className="w-full mt-3 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-foreground hover:text-background transition-colors">
        View Profile
      </button>
    </Link>
  );
}
