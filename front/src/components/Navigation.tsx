


export function Navigation() {

    const handleGoogleLogin = () => {
        
        const clientId = "TON_CLIENT_ID";
        const redirectUri = "https://analyzer.lumenjuris.com/auth/google/callback";

        const scope = "openid email profile";

        const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(scope)}`;

        window.location.href = url;
    };

    return (
        <div>
            <button onClick={()=>handleGoogleLogin}>Connection avec Google</button>
        </div>
    )
}