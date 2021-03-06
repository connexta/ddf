/**
 * Copyright (c) Codice Foundation
 *
 * <p>This is free software: you can redistribute it and/or modify it under the terms of the GNU
 * Lesser General Public License as published by the Free Software Foundation, either version 3 of
 * the License, or any later version.
 *
 * <p>This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details. A copy of the GNU Lesser General Public
 * License is distributed along with this program and can be found at
 * <http://www.gnu.org/licenses/lgpl.html>.
 */
package ddf.camel.component.catalog;

import ddf.catalog.CatalogFramework;
import ddf.catalog.transform.CatalogTransformerException;
import ddf.mime.MimeTypeMapper;
import ddf.mime.MimeTypeToTransformerMapper;
import java.util.Map;
import org.apache.camel.Endpoint;
import org.apache.camel.impl.DefaultComponent;
import org.osgi.framework.BundleContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Represents the component that manages {@link CatalogEndpoint} and resolves to <code>catalog
 * </code> custom scheme in Camel route nodes.
 *
 * @author Hugh Rodgers
 * @author William Miller
 */
public class CatalogComponent extends DefaultComponent {
  public static final String ID_PARAMETER = "id";

  public static final String MIME_TYPE_PARAMETER = "mimeType";

  /** The name of the scheme this custom Camel component resolves to. */
  public static final String NAME = "catalog";

  private static final Logger LOGGER = LoggerFactory.getLogger(CatalogComponent.class);

  private BundleContext bundleContext;

  private MimeTypeToTransformerMapper mimeTypeToTransformerMapper;

  private CatalogFramework catalogFramework;

  private MimeTypeMapper mimeTypeMapper;

  public CatalogComponent() {
    super();
    LOGGER.debug("INSIDE CatalogComponent constructor");
  }

  /*
   * (non-Javadoc)
   *
   * @see org.apache.camel.impl.DefaultComponent#createEndpoint(java.lang.String,
   * java.lang.String, java.util.Map)
   */
  protected Endpoint createEndpoint(String uri, String remaining, Map<String, Object> parameters)
      throws CatalogTransformerException {
    LOGGER.trace("ENTERING: createEndpoint");

    LOGGER.debug(
        "CatalogEndpoint: uri = {}, remaining = {}, parameters = {}", uri, remaining, parameters);

    String transformerId = getAndRemoveParameter(parameters, ID_PARAMETER, String.class);

    String mimeType = getAndRemoveParameter(parameters, MIME_TYPE_PARAMETER, String.class);

    LOGGER.debug("transformerId = {}", transformerId);

    Endpoint endpoint =
        new CatalogEndpoint(
            uri, this, transformerId, mimeType, remaining, catalogFramework, mimeTypeMapper);
    try {
      setProperties(endpoint, parameters);
    } catch (Exception e) {
      throw new CatalogTransformerException("Failed to create transformer endpoint", e);
    }

    LOGGER.trace("EXITING: createEndpoint");
    return endpoint;
  }

  /**
   * Retrieves the bundle context.
   *
   * @return the bundle context
   */
  public BundleContext getBundleContext() {
    return bundleContext;
  }

  /**
   * Sets the bundle context.
   *
   * @param bundleContext
   */
  public void setBundleContext(BundleContext bundleContext) {
    LOGGER.debug("Setting bundleContext");
    this.bundleContext = bundleContext;
  }

  /**
   * Retrieves the mimetype-to-transformer mapper service.
   *
   * @return the mimetype-to-transformer mapper service
   */
  public MimeTypeToTransformerMapper getMimeTypeToTransformerMapper() {
    return mimeTypeToTransformerMapper;
  }

  /**
   * Sets the mimetype-to-transformer mapper service.
   *
   * @param mimeTypeToTransformerMapper
   */
  public void setMimeTypeToTransformerMapper(
      MimeTypeToTransformerMapper mimeTypeToTransformerMapper) {
    LOGGER.debug("Setting mimeTypeToTransformerMapper");
    this.mimeTypeToTransformerMapper = mimeTypeToTransformerMapper;
  }

  /**
   * Sets the catalog framework
   *
   * @param catalogFramework the catalog framework
   */
  public void setCatalogFramework(CatalogFramework catalogFramework) {
    this.catalogFramework = catalogFramework;
  }

  public void setMimeTypeMapper(MimeTypeMapper mimeTypeMapper) {
    this.mimeTypeMapper = mimeTypeMapper;
  }
}
