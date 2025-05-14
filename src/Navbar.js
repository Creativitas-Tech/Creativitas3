import { Link } from 'react-router-dom';

    function Navbar(props) {
        return (
            <span className="span-container" >
                <div>Creativitas</div>
                <span className="span-container">
                    {props.page !== "Home" &&
                        <Link to="/" className="text-button home-link" onClick={() => props.setPage('Home')}>
                            Home
                        </Link>
                    }
                    {props.page !== "Blog" &&
                    <Link to="/blog" className="text-button" onClick={() => props.setPage('Blog')}>
                        Blog
                    </Link>
                }
                    {props.page !== "TableOfContents" &&
                        <Link to="/TableOfContents" className="text-button" onClick={() => props.setPage('TableOfContents')}>
                            Table Of Contents
                        </Link>
                    }
                </span>
            </span>
        );
    }
    export default Navbar;
