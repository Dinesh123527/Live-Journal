import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import { formatName, getInitials } from '../../utils/helpers';
import './UserProfile.scss';

const UserProfile = ({ userInfo, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format name for display in navbar (shorter)
  const displayName = formatName(userInfo.name, 18);
  // Format name for dropdown (slightly longer)
  const dropdownDisplayName = formatName(userInfo.name, 30);

  return (
    <div className="user-profile" ref={dropdownRef}>
      <button className="profile-trigger" onClick={toggleDropdown}>
        <div className="profile-avatar">
          {userInfo.avatar ? (
            <img src={userInfo.avatar} alt={userInfo.name} />
          ) : (
            <span className="avatar-initials">{getInitials(userInfo.name)}</span>
          )}
        </div>
        <span className="profile-name">{displayName}</span>
        <ChevronDown size={16} className={`chevron ${isDropdownOpen ? 'open' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className="profile-dropdown">
          <div className="dropdown-header">
            <div className="profile-avatar-large">
              {userInfo.avatar ? (
                <img src={userInfo.avatar} alt={userInfo.name} />
              ) : (
                <span className="avatar-initials">{getInitials(userInfo.name)}</span>
              )}
            </div>
            <div className="profile-info">
              <p className="profile-name-large" title={userInfo.name}>{dropdownDisplayName}</p>
              {userInfo.email && <p className="profile-email">{userInfo.email}</p>}
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <div className="dropdown-menu">
            <button className="dropdown-item logout" onClick={onLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
