import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"
import Button from "../components/button"

class IndexPage extends React.Component {
  render() {
    const siteTitle = `Hi, I am Shubham`;

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO
          title="Home"
          keywords={[`blog`, `gatsby`, `javascript`, `react`]}
        />
        <img style={{ margin: 0 }} src="./GatsbyScene.svg" alt="Gatsby Scene" />
        <h1>
          I am a Software Engineer{" "}
          <span role="img" aria-label="wave emoji">
            👋
          </span>
        </h1>
        <p>I have been working as a web developer for last three years.</p>
        <p>
          I have experience in javascript, react, node, python, express, and django. I am an avid fan of new technologies and is always on the look out for new challenges.
        </p>
        <p>I am also a poetm on sideline. You can check my work below.</p>
        <Link to="/blog/">
          <Button marginTop="35px">Go to Blog</Button>
        </Link>
      </Layout>
    )
  }
}

export default IndexPage
