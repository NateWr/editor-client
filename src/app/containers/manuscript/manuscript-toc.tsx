import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Drawer, Divider, Hidden, List, ListItem, ListItemText } from '@material-ui/core';
import classNames from 'classnames';

import { useOutlinePanelStyles } from './styles';
import { getArticleInformation, getJournalMeta } from 'app/selectors/manuscript.selectors';
import { ClearFocus } from 'app/containers/manuscript/clear-focus';
import { getManuscriptBodyTOC } from 'app/selectors/manuscript-editor.selectors';
import { TableOfContents, TOCEntry } from 'app/types/manuscript';
import { scrollIntoViewAction } from 'app/actions/manuscript-editor.actions';
import { getConfigState } from 'app/selectors/config.selectors';

export interface ManuscriptTOCProps {
  tocOpen: boolean;
  handleTocToggle(): void;
}

export const ManuscriptTOC: React.FC<ManuscriptTOCProps> = (props) => {
  const classes = useOutlinePanelStyles(props);
  const dispatch = useDispatch();
  const { tocOpen, handleTocToggle } = props;

  const articleInfo = useSelector(getArticleInformation);
  const journalMeta = useSelector(getJournalMeta);
  const manuscriptBodyTOC = useSelector(getManuscriptBodyTOC);
  const config = useSelector(getConfigState);
  let toc = config.toc;
  const bodyIndex = toc.findIndex(item => item.id === 'body');
  if (bodyIndex !== -1 && manuscriptBodyTOC.length) {
    toc.splice(bodyIndex, 1, ...manuscriptBodyTOC);
  }

  const handleTOCClick = useCallback(
    (entry: TOCEntry) => () => {
      dispatch(scrollIntoViewAction(entry));
    },
    [dispatch]
  );

  const drawer = (
    <React.Fragment>
      <ClearFocus>
        <section className={classes.toolbarPlaceholder} aria-hidden="true">
          <h1 className={classes.title}>Libero Editor</h1>
          <h3 className={classes.infoText}>Software: v{process.env.REACT_APP_VERSION}</h3>
          <h3 className={classNames(classes.infoText, classes.dtd)}>JATS: {articleInfo.dtd} DTD</h3>
          <h3 className={classes.infoText}>Type: {articleInfo.articleType}</h3>
        </section>
      </ClearFocus>
      <Divider />
      <List>
        {toc.map((entry, index) => (
          <ListItem button key={index} onClick={handleTOCClick(entry)} style={{ paddingLeft: entry.level * 16 }}>
            <ListItemText
              disableTypography
              classes={{ root: entry.level === 1 ? classes.tocLevel1 : classes.tocLevel2 }}
              primary={entry.title}
            />
          </ListItem>
        ))}
      </List>
      <ClearFocus className={classes.whiteSpace} />
      <section className={classes.journalMeta}>
        <div>{journalMeta.publisherName}</div>
        <div>ISSN: {journalMeta.issn}</div>
      </section>
    </React.Fragment>
  );

  const renderContent = (): JSX.Element => (
    <nav className={classes.drawer} aria-label="mailbox folders">
      <Hidden smUp implementation="css">
        <Drawer
          variant="temporary"
          anchor="left"
          open={tocOpen}
          onClose={handleTocToggle}
          classes={{
            paper: classes.drawerPaper
          }}
          ModalProps={{
            keepMounted: true // Better open performance on mobile.
          }}
        >
          {drawer}
        </Drawer>
      </Hidden>
      <Hidden xsDown implementation="css">
        <Drawer
          classes={{
            paper: classes.drawerPaper
          }}
          variant="permanent"
          open
        >
          {drawer}
        </Drawer>
      </Hidden>
    </nav>
  );

  return renderContent();
};
