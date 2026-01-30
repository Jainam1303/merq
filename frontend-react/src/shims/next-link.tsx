import { Link, LinkProps } from "react-router-dom";
import React from "react";

type NextLinkProps = LinkProps & {
  href: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
};

const NextLink = ({ href, replace, ...rest }: NextLinkProps) => {
  return <Link to={href} replace={replace} {...rest} />;
};

export default NextLink;
