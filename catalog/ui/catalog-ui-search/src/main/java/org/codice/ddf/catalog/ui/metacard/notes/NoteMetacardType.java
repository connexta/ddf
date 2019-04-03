/**
 * Copyright (c) Connexta, LLC
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
package org.codice.ddf.catalog.ui.metacard.notes;

import ddf.catalog.data.impl.MetacardTypeImpl;
import ddf.catalog.data.impl.types.SecurityAttributes;
import java.util.Arrays;

public class NoteMetacardType extends MetacardTypeImpl {
  public NoteMetacardType() {
    super("resource-note", Arrays.asList(new NoteAttributes(), new SecurityAttributes()));
  }
}
