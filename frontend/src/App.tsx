import axios from 'axios';
import { useState, useEffect } from 'react';
import queryString from 'query-string';
import { useCookies } from 'react-cookie';

const apiPath = 'https://0qpsixd4f0.execute-api.ap-south-1.amazonaws.com/Prod';

export default function App() {
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [cookie, setCookie] = useCookies();
  
  const login = () => {
    (async () => {
      
      try {
        // OAuth Step 1
        const response = await axios({
          url: `${apiPath}/auth/request_token`, 
          method: 'POST',
          withCredentials: true,
        });
        
        const { oauth_url, oauth_token } = response.data;

        // TODO: Temporary hack due to cross-origin. Cookie should be set by the server
        setCookie('oauth_token', oauth_token, { maxAge: (15 * 60 * 1000), secure: true, path: '/' });

        // OAuth Step 2
        window.location.href = oauth_url;

      } catch (error) {
        console.error(error); 
      }
      
    })();
  }
  
  const logout = () => {
    (async () => {
      try {
        await axios({
          url: `${apiPath}/auth/logout`, 
          method: 'POST'
        });
        setIsLoggedIn(false);

        // TODO: Temporary hack due to cross-origin. Cookie should be set by the server
        setCookie('oauth_token', '', { maxAge: -1 });
      } catch (error) {
        console.error(error); 
      }
    })();
  }
  
  useEffect(() => {
    (async() => {
        const {oauth_token, oauth_verifier} = queryString.parse(window.location.search);  
        if (oauth_token && oauth_verifier) {
          try {
            // OAuth Step 3
            const { data: {screenName, userId }} = await axios({
              url: `${apiPath}/auth/access_token`,  
              method: 'POST',
              data: {oauth_token, oauth_verifier},
              withCredentials: true
            });

            setIsLoggedIn(true);
            setName(screenName);
            setUserId(userId);
          } catch (error) {
            console.error(error); 
          }
        }
    })();
  }, []);
  
  return (
    <div>
      {!isLoggedIn &&
        <button onClick={login}>
          <img alt='Twitter login button' src='https://assets.klaudsol.com/twitter.png' />
        </button>
      }
      
      { isLoggedIn &&
        <div>
          <div>Name: {name}</div>
          <div>User ID: {userId}</div>
          <button className='signout-btn' onClick={logout}>Sign Out</button>
        </div>
      }
    </div>
  );
}
